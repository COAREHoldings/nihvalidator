import { supabase } from '../lib/supabase'

export interface Figure {
  id: string
  user_id: string
  project_id: string
  file_path: string
  file_name: string
  file_size: number
  mime_type: string
  caption: string | null
  alt_text: string | null
  width: number | null
  height: number | null
  size_preference: 'compact' | 'medium' | 'large'
  created_at: string
  updated_at: string
  url?: string
}

// NIH Figure Guidelines
export const NIH_FIGURE_GUIDELINES = {
  maxWidth: {
    compact: 3.25, // inches - fits in single column
    medium: 5.0,   // inches - fits across most of page
    large: 6.5     // inches - full page width
  },
  recommendedDPI: 300,
  minDPI: 150, // Below this, figures may be illegible
  maxFileSize: 10 * 1024 * 1024, // 10MB
  supportedFormats: ['PNG', 'JPEG', 'TIFF', 'SVG'],
  tips: [
    'Use high contrast for readability',
    'Keep text in figures at minimum 8pt font',
    'Avoid color-only distinctions (use patterns too)',
    'Compact size recommended to maximize page space'
  ]
}

// Get public URL for a figure
export function getFigureUrl(filePath: string): string {
  const { data } = supabase.storage.from('figures').getPublicUrl(filePath)
  return data.publicUrl
}

// Upload a figure
export async function uploadFigure(
  userId: string,
  projectId: string,
  file: File,
  metadata: {
    caption?: string
    altText?: string
    sizePreference?: 'compact' | 'medium' | 'large'
  } = {}
): Promise<Figure> {
  // Generate unique file path
  const fileExt = file.name.split('.').pop()
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
  const filePath = `${userId}/${projectId}/${fileName}`
  
  // Upload to storage
  const { error: uploadError } = await supabase.storage
    .from('figures')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    })
  
  if (uploadError) {
    throw new Error(`Failed to upload figure: ${uploadError.message}`)
  }
  
  // Get image dimensions
  const dimensions = await getImageDimensions(file)
  
  // Save metadata to database
  const { data, error: dbError } = await supabase
    .from('figures')
    .insert({
      user_id: userId,
      project_id: projectId,
      file_path: filePath,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
      caption: metadata.caption || null,
      alt_text: metadata.altText || null,
      width: dimensions.width,
      height: dimensions.height,
      size_preference: metadata.sizePreference || 'compact'
    })
    .select()
    .single()
  
  if (dbError) {
    // Try to clean up uploaded file
    await supabase.storage.from('figures').remove([filePath])
    throw new Error(`Failed to save figure metadata: ${dbError.message}`)
  }
  
  return {
    ...data,
    url: getFigureUrl(filePath)
  }
}

// Get image dimensions from file
async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      resolve({ width: img.width, height: img.height })
      URL.revokeObjectURL(img.src)
    }
    img.onerror = () => {
      resolve({ width: 0, height: 0 })
      URL.revokeObjectURL(img.src)
    }
    img.src = URL.createObjectURL(file)
  })
}

// Get all figures for a project
export async function getProjectFigures(userId: string, projectId: string): Promise<Figure[]> {
  const { data, error } = await supabase
    .from('figures')
    .select('*')
    .eq('user_id', userId)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
  
  if (error) {
    throw new Error(`Failed to fetch figures: ${error.message}`)
  }
  
  return (data || []).map(fig => ({
    ...fig,
    url: getFigureUrl(fig.file_path)
  }))
}

// Update figure metadata
export async function updateFigure(
  figureId: string,
  userId: string,
  updates: {
    caption?: string
    altText?: string
    sizePreference?: 'compact' | 'medium' | 'large'
  }
): Promise<Figure> {
  const { data, error } = await supabase
    .from('figures')
    .update({
      caption: updates.caption,
      alt_text: updates.altText,
      size_preference: updates.sizePreference,
      updated_at: new Date().toISOString()
    })
    .eq('id', figureId)
    .eq('user_id', userId)
    .select()
    .single()
  
  if (error) {
    throw new Error(`Failed to update figure: ${error.message}`)
  }
  
  return {
    ...data,
    url: getFigureUrl(data.file_path)
  }
}

// Delete a figure
export async function deleteFigure(figureId: string, userId: string): Promise<void> {
  // Get figure info first
  const { data: figure, error: fetchError } = await supabase
    .from('figures')
    .select('file_path')
    .eq('id', figureId)
    .eq('user_id', userId)
    .single()
  
  if (fetchError || !figure) {
    throw new Error('Figure not found')
  }
  
  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from('figures')
    .remove([figure.file_path])
  
  if (storageError) {
    console.error('Failed to delete file from storage:', storageError)
  }
  
  // Delete from database
  const { error: dbError } = await supabase
    .from('figures')
    .delete()
    .eq('id', figureId)
    .eq('user_id', userId)
  
  if (dbError) {
    throw new Error(`Failed to delete figure: ${dbError.message}`)
  }
}

// Calculate estimated page space for a figure
export function estimatePageSpace(
  widthPx: number,
  heightPx: number,
  sizePreference: 'compact' | 'medium' | 'large',
  dpi: number = 300
): {
  widthInches: number
  heightInches: number
  estimatedLines: number
  warning: string | null
} {
  const maxWidth = NIH_FIGURE_GUIDELINES.maxWidth[sizePreference]
  const widthInches = Math.min(widthPx / dpi, maxWidth)
  const aspectRatio = heightPx / widthPx
  const heightInches = widthInches * aspectRatio
  
  // Estimate lines (assuming ~6 lines per inch in typical NIH format)
  const estimatedLines = Math.ceil(heightInches * 6)
  
  let warning: string | null = null
  
  if (widthPx / maxWidth < NIH_FIGURE_GUIDELINES.minDPI) {
    warning = 'Image resolution may be too low for print quality'
  }
  
  if (heightInches > 4) {
    warning = 'Large figure - consider if this space is justified'
  }
  
  return {
    widthInches: Math.round(widthInches * 100) / 100,
    heightInches: Math.round(heightInches * 100) / 100,
    estimatedLines,
    warning
  }
}
