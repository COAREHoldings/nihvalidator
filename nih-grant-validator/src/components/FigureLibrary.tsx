import { useState, useEffect, useCallback, useRef } from 'react'
import { Upload, Image, Trash2, Edit2, X, Check, AlertTriangle, Info, Loader2 } from 'lucide-react'
import { 
  Figure, 
  uploadFigure, 
  getProjectFigures, 
  updateFigure, 
  deleteFigure,
  estimatePageSpace,
  NIH_FIGURE_GUIDELINES 
} from '../services/figureService'
import { useAuth } from '../contexts/AuthContext'

interface FigureLibraryProps {
  projectId: string
  onSelectFigure?: (figure: Figure) => void
}

export function FigureLibrary({ projectId, onSelectFigure }: FigureLibraryProps) {
  const { user } = useAuth()
  const [figures, setFigures] = useState<Figure[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editCaption, setEditCaption] = useState('')
  const [showGuidelines, setShowGuidelines] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load figures
  const loadFigures = useCallback(async () => {
    if (!user || !projectId) return
    
    setLoading(true)
    try {
      const data = await getProjectFigures(user.id, projectId)
      setFigures(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load figures')
    } finally {
      setLoading(false)
    }
  }, [user, projectId])

  useEffect(() => {
    loadFigures()
  }, [loadFigures])

  // Handle file upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0 || !user) return

    setUploading(true)
    setError(null)

    try {
      for (const file of Array.from(files)) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          throw new Error(`${file.name} is not an image file`)
        }

        // Validate file size
        if (file.size > NIH_FIGURE_GUIDELINES.maxFileSize) {
          throw new Error(`${file.name} exceeds 10MB limit`)
        }

        await uploadFigure(user.id, projectId, file, {
          sizePreference: 'compact' // Default to compact
        })
      }

      await loadFigures()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // Handle delete
  const handleDelete = async (figure: Figure) => {
    if (!user || !confirm('Delete this figure? This cannot be undone.')) return

    try {
      await deleteFigure(figure.id, user.id)
      setFigures(prev => prev.filter(f => f.id !== figure.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  // Handle edit caption
  const startEdit = (figure: Figure) => {
    setEditingId(figure.id)
    setEditCaption(figure.caption || '')
  }

  const saveEdit = async (figure: Figure) => {
    if (!user) return

    try {
      const updated = await updateFigure(figure.id, user.id, { caption: editCaption })
      setFigures(prev => prev.map(f => f.id === figure.id ? updated : f))
      setEditingId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed')
    }
  }

  // Calculate page impact
  const getPageImpact = (figure: Figure) => {
    if (!figure.width || !figure.height) return null
    return estimatePageSpace(figure.width, figure.height, figure.size_preference)
  }

  return (
    <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Image className="w-5 h-5 text-neutral-400" />
          <h3 className="font-semibold text-neutral-900">Figure Library</h3>
          <span className="text-sm text-neutral-500">({figures.length})</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGuidelines(!showGuidelines)}
            className="p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
            title="NIH Guidelines"
          >
            <Info className="w-4 h-4" />
          </button>
          <label className="flex items-center gap-2 px-3 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 cursor-pointer transition-colors">
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            <span className="text-sm font-medium">Upload</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              disabled={uploading}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Guidelines Panel */}
      {showGuidelines && (
        <div className="p-4 bg-blue-50 border-b border-blue-100">
          <h4 className="font-medium text-blue-900 mb-2">NIH Figure Guidelines</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            {NIH_FIGURE_GUIDELINES.tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-blue-500">•</span>
                {tip}
              </li>
            ))}
          </ul>
          <div className="mt-3 text-xs text-blue-600">
            <strong>Size guide:</strong> Compact (3.25"), Medium (5"), Large (6.5") width
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 border-b border-red-100 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <span className="text-sm text-red-700">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Figure Grid */}
      <div className="p-4">
        {loading ? (
          <div className="py-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto mb-2" />
            <p className="text-neutral-500">Loading figures...</p>
          </div>
        ) : figures.length === 0 ? (
          <div className="py-12 text-center">
            <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Image className="w-8 h-8 text-neutral-400" />
            </div>
            <p className="text-neutral-500 mb-2">No figures uploaded yet</p>
            <p className="text-sm text-neutral-400">Upload images, graphs, or charts for your grant</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {figures.map(figure => {
              const impact = getPageImpact(figure)
              
              return (
                <div
                  key={figure.id}
                  className="group border border-neutral-200 rounded-lg overflow-hidden hover:border-primary-300 hover:shadow-md transition-all"
                >
                  {/* Image */}
                  <div 
                    className="aspect-square bg-neutral-100 relative cursor-pointer"
                    onClick={() => onSelectFigure?.(figure)}
                  >
                    <img
                      src={figure.url}
                      alt={figure.alt_text || figure.file_name}
                      className="w-full h-full object-contain"
                    />
                    
                    {/* Size badge */}
                    <span className={`absolute top-2 left-2 text-xs px-2 py-0.5 rounded-full font-medium ${
                      figure.size_preference === 'compact' ? 'bg-green-100 text-green-700' :
                      figure.size_preference === 'medium' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {figure.size_preference}
                    </span>

                    {/* Actions overlay */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); startEdit(figure) }}
                        className="p-2 bg-white rounded-lg hover:bg-neutral-100"
                        title="Edit caption"
                      >
                        <Edit2 className="w-4 h-4 text-neutral-700" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(figure) }}
                        className="p-2 bg-white rounded-lg hover:bg-red-50"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-2">
                    {editingId === figure.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={editCaption}
                          onChange={(e) => setEditCaption(e.target.value)}
                          placeholder="Add caption..."
                          className="flex-1 text-xs px-2 py-1 border border-neutral-200 rounded"
                          autoFocus
                        />
                        <button onClick={() => saveEdit(figure)} className="p-1 text-green-600 hover:bg-green-50 rounded">
                          <Check className="w-3 h-3" />
                        </button>
                        <button onClick={() => setEditingId(null)} className="p-1 text-neutral-400 hover:bg-neutral-100 rounded">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <p className="text-xs text-neutral-900 truncate font-medium">
                          {figure.caption || figure.file_name}
                        </p>
                        {impact && (
                          <p className="text-xs text-neutral-500">
                            ~{impact.estimatedLines} lines ({impact.widthInches}" × {impact.heightInches}")
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
