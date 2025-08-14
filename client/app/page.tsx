"use client"
import type React from "react"
import { useState, useRef } from "react"
import { Upload, Play, Pause, Volume2, Bird, Loader2, AlertCircle, LogOut } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import birdSeasons from '@/app/bird_seasons.json'
// ⬅️ NEW — fixed lookup to search array instead of indexing
function getSeasonForBird(birdName: string) {
  const match = (birdSeasons as { species: string; season: string }[]).find(
    b => b.species.toLowerCase() === birdName.toLowerCase()
  );
  return match ? match.season : '';
}

interface PredictionResult {
  prediction: string
  confidence: number
}

export default function BirdAudioPredictor() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [prediction, setPrediction] = useState<PredictionResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)

  const audioRef = useRef<HTMLAudioElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const handleLogout = () => {
    localStorage.removeItem("access")
    localStorage.removeItem("refresh")
    document.cookie = "access=; Max-Age=0; path=/"
    document.cookie = "refresh=; Max-Age=0; path=/"
    toast.success("Logged out successfully 👋")
    router.push("/login")
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith("audio/")) {
      setError("Please select an audio file")
      return
    }
    if (file.size > 50 * 1024 * 1024) {
      setError("File size must be less than 50MB")
      return
    }
    setSelectedFile(file)
    setError(null)
    setPrediction(null)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0])
    }
  }

  const togglePlayback = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const uploadAndPredict = async () => {
    if (!selectedFile) return
    setIsUploading(true)
    setError(null)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append("file", selectedFile)

      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + 10
        })
      }, 200)

      const response = await fetch("http://localhost:8000/api/predict/", {
        method: "POST",
        body: formData,
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result: PredictionResult = await response.json()
      setPrediction(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload and predict")
    } finally {
      setIsUploading(false)
      setTimeout(() => setUploadProgress(0), 1000)
    }
  }

  const resetUpload = () => {
    setSelectedFile(null)
    setPrediction(null)
    setError(null)
    setIsPlaying(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const getBirdDisplayName = (prediction: string) => {
    return prediction.replace("_sound", "").replace(/_/g, " ")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <Button onClick={handleLogout} variant="outline" size="sm" className="flex items-center gap-2">
          <LogOut className="h-4 w-4" />
          Logout
        </Button>

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Bird className="h-8 w-8 text-green-600" />
            <h1 className="text-3xl font-bold text-gray-900">Bird Sound Classification</h1>
          </div>
          <p className="text-gray-600">Upload bird audio to identify the species using AI</p>
        </div>

        {/* Upload Card */}
        <Card>
          <CardHeader>
            <CardTitle>Upload Audio File</CardTitle>
            <CardDescription>
              Drag and drop an audio file or click to browse. Supported formats: MP3, WAV, M4A, OGG
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? "border-green-500 bg-green-50"
                  : selectedFile
                    ? "border-green-300 bg-green-25"
                    : "border-gray-300 hover:border-gray-400"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {selectedFile ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-center">
                    <Volume2 className="h-12 w-12 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{selectedFile.name}</p>
                    <p className="text-sm text-gray-500">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                  </div>
                  <div className="flex items-center justify-center gap-4">
                    <Button variant="outline" size="sm" onClick={togglePlayback} className="flex items-center gap-2 bg-transparent">
                      {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      {isPlaying ? "Pause" : "Play"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={resetUpload}>Remove</Button>
                  </div>
                  <audio
                    ref={audioRef}
                    src={URL.createObjectURL(selectedFile)}
                    onEnded={() => setIsPlaying(false)}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                  <div>
                    <p className="text-lg font-medium text-gray-900">Drop your audio file here</p>
                    <p className="text-gray-500">or</p>
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="mt-2">
                      Browse Files
                    </Button>
                  </div>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileInputChange}
                className="hidden"
              />
            </div>

            {isUploading && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Uploading and analyzing...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="w-full" />
              </div>
            )}

            {selectedFile && !isUploading && (
              <div className="mt-4 flex justify-center">
                <Button onClick={uploadAndPredict} className="flex items-center gap-2">
                  <Bird className="h-4 w-4" />
                  Identify Bird Species
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {prediction && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bird className="h-5 w-5 text-green-600" />
                Identification Results
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-center">
                <div className="relative w-80 h-60 rounded-lg overflow-hidden border-2 border-gray-200 shadow-lg">
                  <img
                    src={`/birds/${prediction.prediction}.jpg`}
                    alt={getBirdDisplayName(prediction.prediction)}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const currentSrc = e.currentTarget.src
                      if (currentSrc.endsWith('.jpg')) {
                        e.currentTarget.src = `/birds/${prediction.prediction}.png`
                      } else if (currentSrc.endsWith('.png')) {
                        e.currentTarget.src = `/birds/${prediction.prediction}.jpeg`
                      } else {
                        e.currentTarget.src = `/placeholder.svg?height=240&width=320&text=${encodeURIComponent(getBirdDisplayName(prediction.prediction))}`
                      }
                    }}
                  />
                </div>
              </div>

              <div className="text-center space-y-3">
                <h3 className="text-3xl font-bold text-gray-900">
                  {getBirdDisplayName(prediction.prediction)}
                </h3>
                <Badge variant="secondary" className="text-xl px-4 py-2">
                  {prediction.confidence.toFixed(2)}% confidence
                </Badge>

                {/* ⬅️ NEW — Show breeding season */}
                <p className="text-lg text-gray-700">
                  Season: {getSeasonForBird(getBirdDisplayName(prediction.prediction))}
                </p>
              </div>

              <div className="flex justify-center gap-3">
                <Button variant="outline" onClick={resetUpload}>
                  Identify Another Bird
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const imageUrl = `/birds/${prediction.prediction}.jpg`
                    window.open(imageUrl, "_blank")
                  }}
                >
                  View Full Image
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {isUploading && (
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <div className="text-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-green-600 mx-auto" />
                <p className="text-gray-600">Analyzing audio and identifying bird species...</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
