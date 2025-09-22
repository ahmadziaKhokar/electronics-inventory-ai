import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Camera, Search, Package, Plus, Trash2, Eye, Loader2 } from 'lucide-react'
import * as tf from '@tensorflow/tfjs'
import * as cocoSsd from '@tensorflow-models/coco-ssd'
import './App.css'

function App() {
  const [containers, setContainers] = useState([])
  const [selectedContainer, setSelectedContainer] = useState('')
  const [newItem, setNewItem] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [model, setModel] = useState(null)
  const [modelLoading, setModelLoading] = useState(false)
  const [detectedObjects, setDetectedObjects] = useState([])
  const [uploadedImage, setUploadedImage] = useState(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const imageRef = useRef(null)

  // Load data from localStorage on component mount
  useEffect(() => {
    const savedContainers = localStorage.getItem('inventoryContainers')
    if (savedContainers) {
      setContainers(JSON.parse(savedContainers))
    } else {
      // Add sample data for demonstration
      const sampleData = [
        {
          id: 'BOX-001',
          items: ['Arduino Uno', 'Breadboard', 'Jumper Wires'],
          timestamp: new Date().toLocaleString()
        },
        {
          id: 'BOX-002',
          items: ['Resistors 220Ω', 'LEDs', 'Capacitors 100µF'],
          timestamp: new Date().toLocaleString()
        }
      ]
      setContainers(sampleData)
    }
  }, [])

  // Load TensorFlow.js model on component mount
  useEffect(() => {
    const loadModel = async () => {
      setModelLoading(true)
      try {
        console.log('Loading COCO-SSD model...')
        
        // Set TensorFlow.js backend for better compatibility
        await tf.ready()
        console.log('TensorFlow.js backend:', tf.getBackend())
        
        const loadedModel = await cocoSsd.load({
          base: 'mobilenet_v2' // Use more compatible model version
        })
        setModel(loadedModel)
        console.log('Model loaded successfully!')
      } catch (error) {
        console.error('Error loading model:', error)
        // Retry with lite model if main model fails
        try {
          console.log('Retrying with lite model...')
          const liteModel = await cocoSsd.load({
            base: 'lite_mobilenet_v2'
          })
          setModel(liteModel)
          console.log('Lite model loaded successfully!')
        } catch (retryError) {
          console.error('Failed to load any model:', retryError)
        }
      } finally {
        setModelLoading(false)
      }
    }
    loadModel()
  }, [])

  // Save data to localStorage whenever containers change
  useEffect(() => {
    localStorage.setItem('inventoryContainers', JSON.stringify(containers))
  }, [containers])

  // Start camera for scanning
  const startCamera = async () => {
    setIsScanning(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } // Use back camera on mobile
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (error) {
      console.error('Error accessing camera:', error)
      // Fallback to manual container creation
      const containerId = prompt('Camera not available. Enter container ID manually:')
      if (containerId && containerId.trim()) {
        addManualContainer(containerId.trim())
      }
      setIsScanning(false)
    }
  }

  // Add container manually (fallback when camera is not available)
  const addManualContainer = (containerId) => {
    // Check if container already exists
    if (containers.find(c => c.id === containerId)) {
      alert('Container with this ID already exists!')
      return
    }

    const newContainer = {
      id: containerId,
      items: [],
      timestamp: new Date().toLocaleString()
    }
    
    setContainers(prev => [...prev, newContainer])
    alert(`Container ${containerId} added successfully!`)
  }

  // Stop camera
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks()
      tracks.forEach(track => track.stop())
    }
    setIsScanning(false)
  }

  // Handle image upload
  const handleImageUpload = (event) => {
    const file = event.target.files[0]
    if (!file) {
      console.log('No file selected')
      return
    }

    console.log('File selected:', file.name, file.type, file.size)

    // Validate file type
    if (!file.type.startsWith('image/')) {
      console.error('Invalid file type:', file.type)
      alert('Please select a valid image file!')
      return
    }
    
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      console.error('File too large:', file.size)
      alert('Image file is too large! Please select an image smaller than 10MB.')
      return
    }

    console.log('Starting FileReader...')
    const reader = new FileReader()
    
    reader.onloadstart = () => {
      console.log('FileReader started')
    }
    
    reader.onprogress = (e) => {
      console.log('FileReader progress:', e.loaded, '/', e.total)
    }
    
    reader.onload = (e) => {
      console.log('FileReader success, result length:', e.target.result.length)
      setUploadedImage(e.target.result)
      console.log('Image state updated')
    }
    
    reader.onerror = (e) => {
      console.error('FileReader error:', e, reader.error)
      alert(`Error reading file: ${reader.error?.message || 'Unknown error'}`)
    }
    
    reader.onabort = () => {
      console.error('FileReader aborted')
      alert('File reading was aborted')
    }

    try {
      reader.readAsDataURL(file)
      console.log('FileReader.readAsDataURL called')
    } catch (error) {
      console.error('Error calling readAsDataURL:', error)
      alert('Failed to start reading file')
    }
  }

  // Analyze uploaded image with AI
  const analyzeUploadedImage = async () => {
    if (!uploadedImage) {
      alert('Please upload an image first!')
      return
    }
    
    if (!model) {
      alert('AI model is still loading. Please wait a moment and try again.')
      return
    }

    setIsAnalyzing(true)
    setDetectedObjects([])

    try {
      const img = imageRef.current
      
      // Ensure image is loaded
      if (!img || !img.complete || img.naturalWidth === 0) {
        throw new Error('Image not loaded properly')
      }
      
      // Use AI to detect objects in the uploaded image
      console.log('Analyzing uploaded image with AI...')
      const predictions = await model.detect(img)
      console.log('Detected objects:', predictions)

      if (predictions.length > 0) {
        // Filter predictions with confidence > 0.3 (lower threshold for uploaded images)
        const validPredictions = predictions.filter(pred => pred.score > 0.3)
        setDetectedObjects(validPredictions)

        // Generate container ID
        const containerId = `BOX-${Date.now().toString().slice(-6)}`
        
        // Extract detected item names
        const detectedItems = validPredictions.map(pred => 
          `${pred.class} (${Math.round(pred.score * 100)}%)`
        )

        // Create new container with detected items
        const newContainer = {
          id: containerId,
          items: detectedItems,
          timestamp: new Date().toLocaleString(),
          aiGenerated: true
        }
        
        setContainers(prev => [...prev, newContainer])
        
        alert(`Container ${containerId} created!\nDetected ${detectedItems.length} items: ${detectedItems.join(', ')}`)
        
        // Clear uploaded image
        setUploadedImage(null)
      } else {
        alert('No objects detected with sufficient confidence. Try a different image with clearer objects.')
      }
    } catch (error) {
      console.error('Error analyzing image:', error)
      alert('Error analyzing image. Please try again.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Analyze container contents with AI (camera)
  const analyzeContainer = async () => {
    if (!videoRef.current || !canvasRef.current || !model) {
      alert('Camera or AI model not ready!')
      return
    }

    setIsAnalyzing(true)
    setDetectedObjects([])

    try {
      const canvas = canvasRef.current
      const video = videoRef.current
      const context = canvas.getContext('2d')
      
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      context.drawImage(video, 0, 0)

      // Use AI to detect objects in the image
      console.log('Analyzing image with AI...')
      const predictions = await model.detect(canvas)
      console.log('Detected objects:', predictions)

      if (predictions.length > 0) {
        // Filter predictions with confidence > 0.5
        const validPredictions = predictions.filter(pred => pred.score > 0.5)
        setDetectedObjects(validPredictions)

        // Generate container ID
        const containerId = `BOX-${Date.now().toString().slice(-6)}`
        
        // Extract detected item names
        const detectedItems = validPredictions.map(pred => 
          `${pred.class} (${Math.round(pred.score * 100)}%)`
        )

        // Create new container with detected items
        const newContainer = {
          id: containerId,
          items: detectedItems,
          timestamp: new Date().toLocaleString(),
          aiGenerated: true
        }
        
        setContainers(prev => [...prev, newContainer])
        
        alert(`Container ${containerId} created!\nDetected ${detectedItems.length} items: ${detectedItems.join(', ')}`)
      } else {
        alert('No objects detected with sufficient confidence. Try adjusting the camera angle or lighting.')
      }
    } catch (error) {
      console.error('Error analyzing image:', error)
      alert('Error analyzing image. Please try again.')
    } finally {
      setIsAnalyzing(false)
      stopCamera()
    }
  }

  // Add item to selected container
  const addItem = () => {
    if (!selectedContainer || !newItem.trim()) {
      alert('Please select a container and enter an item name.')
      return
    }

    setContainers(prev => prev.map(container => 
      container.id === selectedContainer 
        ? { ...container, items: [...container.items, newItem.trim()] }
        : container
    ))
    setNewItem('')
  }

  // Remove item from container
  const removeItem = (containerId, itemIndex) => {
    setContainers(prev => prev.map(container => 
      container.id === containerId 
        ? { ...container, items: container.items.filter((_, index) => index !== itemIndex) }
        : container
    ))
  }

  // Remove entire container
  const removeContainer = (containerId) => {
    if (confirm('Are you sure you want to remove this container and all its items?')) {
      setContainers(prev => prev.filter(container => container.id !== containerId))
      if (selectedContainer === containerId) {
        setSelectedContainer('')
      }
    }
  }

  // Export data as JSON
  const exportData = () => {
    const dataStr = JSON.stringify(containers, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `inventory-backup-${new Date().toISOString().split('T')[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  // Import data from JSON file
  const importData = (event) => {
    const file = event.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target.result)
        if (Array.isArray(importedData)) {
          setContainers(importedData)
          alert('Data imported successfully!')
        } else {
          alert('Invalid file format!')
        }
      } catch (error) {
        alert('Error reading file!')
      }
    }
    reader.readAsText(file)
    // Reset file input
    event.target.value = ''
  }

  // Search for items across all containers
  const searchResults = containers.flatMap(container => 
    container.items
      .filter(item => item.toLowerCase().includes(searchTerm.toLowerCase()))
      .map(item => ({ item, containerId: container.id }))
  )

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Electronics Lab Inventory</h1>
          <p className="text-gray-600">Manage your lab equipment and components</p>
          
          {/* Data Management */}
          <div className="flex justify-center gap-2 mt-4">
            <Button variant="outline" onClick={exportData} size="sm">
              Export Data
            </Button>
            <label className="cursor-pointer">
              <Button variant="outline" size="sm" asChild>
                <span>Import Data</span>
              </Button>
              <input
                type="file"
                accept=".json"
                onChange={importData}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Camera Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              AI-Powered Container Analysis
              {modelLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {modelLoading ? (
              <div className="text-center py-4">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p>Loading AI model...</p>
              </div>
            ) : !isScanning ? (
              <div className="space-y-4">
                {/* Camera Option */}
                <Button 
                  onClick={startCamera} 
                  className="w-full"
                  disabled={!model}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Use Camera for AI Analysis
                </Button>
                
                {/* Image Upload Option */}
                <div className="space-y-2">
                  <label className="block">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={!model}
                    />
                    <Button 
                      variant="outline" 
                      className="w-full"
                      disabled={!model}
                      onClick={() => document.querySelector('input[type="file"]').click()}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Upload Image for AI Analysis
                    </Button>
                  </label>
                  
                  {uploadedImage && (
                    <div className="space-y-2">
                      <img 
                        ref={imageRef}
                        src={uploadedImage} 
                        alt="Uploaded for analysis"
                        className="w-full max-w-md mx-auto rounded-lg"
                        crossOrigin="anonymous"
                      />
                      <div className="flex gap-2">
                        <Button 
                          onClick={analyzeUploadedImage}
                          disabled={isAnalyzing || !model}
                          className="flex-1"
                        >
                          {isAnalyzing ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Analyzing...
                            </>
                          ) : (
                            <>
                              <Eye className="h-4 w-4 mr-2" />
                              Analyze Image
                            </>
                          )}
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => setUploadedImage(null)}
                          className="flex-1"
                        >
                          Clear
                        </Button>
                      </div>
                      {detectedObjects.length > 0 && (
                        <div className="p-2 bg-blue-50 rounded">
                          <p className="text-sm font-medium">Detected Objects:</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {detectedObjects.map((obj, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {obj.class} ({Math.round(obj.score * 100)}%)
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Manual Option */}
                <Button 
                  variant="outline" 
                  onClick={() => {
                    const containerId = prompt('Enter container ID:')
                    if (containerId && containerId.trim()) {
                      addManualContainer(containerId.trim())
                    }
                  }} 
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Container Manually
                </Button>
                
                {!model && (
                  <p className="text-sm text-gray-500 text-center">
                    AI model failed to load. Manual mode only.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full max-w-md mx-auto rounded-lg"
                  />
                  <canvas ref={canvasRef} className="hidden" />
                  {detectedObjects.length > 0 && (
                    <div className="mt-2 p-2 bg-blue-50 rounded">
                      <p className="text-sm font-medium">Detected Objects:</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {detectedObjects.map((obj, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {obj.class} ({Math.round(obj.score * 100)}%)
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 justify-center">
                  <Button 
                    onClick={analyzeContainer}
                    disabled={isAnalyzing || !model}
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4 mr-2" />
                        Analyze & Create Container
                      </>
                    )}
                  </Button>
                  <Button variant="outline" onClick={stopCamera}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Item Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add Item
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={selectedContainer} onValueChange={setSelectedContainer}>
              <SelectTrigger>
                <SelectValue placeholder="Select a container" />
              </SelectTrigger>
              <SelectContent>
                {containers.map(container => (
                  <SelectItem key={container.id} value={container.id}>
                    {container.id} ({container.items.length} items)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Input
                placeholder="Enter item name"
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addItem()}
              />
              <Button onClick={addItem}>
                Add Item
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Search Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="Search for items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mb-4"
            />
            {searchTerm && (
              <div className="space-y-2">
                {searchResults.length > 0 ? (
                  searchResults.map((result, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <span className="font-medium">{result.item}</span>
                      <Badge variant="secondary">{result.containerId}</Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No items found matching "{searchTerm}"</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Containers List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Containers ({containers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {containers.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No containers added yet. Scan your first container to get started!</p>
            ) : (
              <div className="space-y-4">
                {containers.map(container => (
                  <div key={container.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{container.id}</h3>
                          {container.aiGenerated && (
                            <Badge variant="secondary" className="text-xs">
                              <Eye className="h-3 w-3 mr-1" />
                              AI Generated
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">Added: {container.timestamp}</p>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removeContainer(container.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Items ({container.items.length}):</p>
                      {container.items.length === 0 ? (
                        <p className="text-gray-500 text-sm">No items in this container</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {container.items.map((item, index) => (
                            <Badge
                              key={index}
                              variant={container.aiGenerated ? "default" : "outline"}
                              className="cursor-pointer hover:bg-red-50"
                              onClick={() => removeItem(container.id, index)}
                            >
                              {item} ×
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default App
