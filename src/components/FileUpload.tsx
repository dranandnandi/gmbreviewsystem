import React, { useState, useRef } from 'react';
import { Upload, X, File, AlertCircle, Check } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useStore } from '../store/useStore';

interface FileUploadProps {
  onFilesUploaded: (urls: string[]) => void;
  maxFiles?: number;
  acceptedTypes?: string[];
  maxSizePerFile?: number; // in MB
  existingFiles?: string[];
}

interface UploadedFile {
  name: string;
  url: string;
  size: number;
  type: string;
}

export function FileUpload({
  onFilesUploaded,
  maxFiles = 5,
  acceptedTypes = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'],
  maxSizePerFile = 10,
  existingFiles = []
}: FileUploadProps) {
  const { user } = useStore();
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize with existing files
  React.useEffect(() => {
    const existingFileObjects = existingFiles.map((url, index) => ({
      name: `Existing file ${index + 1}`,
      url,
      size: 0,
      type: 'existing'
    }));
    setUploadedFiles(existingFileObjects);
  }, [existingFiles]);

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxSizePerFile * 1024 * 1024) {
      return `File "${file.name}" is too large. Maximum size is ${maxSizePerFile}MB.`;
    }

    // Check file type
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!acceptedTypes.includes(fileExtension)) {
      return `File type "${fileExtension}" is not supported. Accepted types: ${acceptedTypes.join(', ')}`;
    }

    return null;
  };

  const uploadFile = async (file: File): Promise<string> => {
    if (!user?.id) throw new Error('User not authenticated');

    // Create unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split('.').pop();
    const fileName = `${user.id}/${timestamp}_${randomString}.${fileExtension}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('reports')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Upload error:', error);
      throw new Error(`Failed to upload ${file.name}: ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('reports')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  };

  const handleFiles = async (files: FileList) => {
    if (!files.length) return;

    setError('');
    setUploading(true);

    try {
      const fileArray = Array.from(files);
      
      // Check total file count
      if (uploadedFiles.length + fileArray.length > maxFiles) {
        throw new Error(`Maximum ${maxFiles} files allowed. You can upload ${maxFiles - uploadedFiles.length} more files.`);
      }

      // Validate all files first
      for (const file of fileArray) {
        const validationError = validateFile(file);
        if (validationError) {
          throw new Error(validationError);
        }
      }

      // Upload files
      const uploadPromises = fileArray.map(async (file) => {
        const url = await uploadFile(file);
        return {
          name: file.name,
          url,
          size: file.size,
          type: file.type
        };
      });

      const newUploadedFiles = await Promise.all(uploadPromises);
      const updatedFiles = [...uploadedFiles, ...newUploadedFiles];
      
      setUploadedFiles(updatedFiles);
      
      // Notify parent component
      const allUrls = updatedFiles.map(f => f.url);
      onFilesUploaded(allUrls);

    } catch (error) {
      console.error('Upload error:', error);
      setError(error instanceof Error ? error.message : 'Failed to upload files');
    } finally {
      setUploading(false);
    }
  };

  const removeFile = async (index: number) => {
    try {
      const fileToRemove = uploadedFiles[index];
      
      // If it's not an existing file, delete from storage
      if (fileToRemove.type !== 'existing') {
        const fileName = fileToRemove.url.split('/').pop();
        if (fileName) {
          await supabase.storage
            .from('reports')
            .remove([`${user?.id}/${fileName}`]);
        }
      }

      const updatedFiles = uploadedFiles.filter((_, i) => i !== index);
      setUploadedFiles(updatedFiles);
      
      // Notify parent component
      const allUrls = updatedFiles.map(f => f.url);
      onFilesUploaded(allUrls);
    } catch (error) {
      console.error('Error removing file:', error);
      setError('Failed to remove file');
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
          dragActive
            ? 'border-indigo-500 bg-indigo-50'
            : 'border-gray-300 hover:border-gray-400'
        } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={uploading}
        />
        
        <div className="text-center">
          <Upload className={`mx-auto h-12 w-12 ${dragActive ? 'text-indigo-500' : 'text-gray-400'}`} />
          <div className="mt-4">
            <p className="text-sm text-gray-600">
              <span className="font-medium text-indigo-600 hover:text-indigo-500">
                Click to upload
              </span>{' '}
              or drag and drop
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {acceptedTypes.join(', ')} up to {maxSizePerFile}MB each
            </p>
            <p className="text-xs text-gray-500">
              Maximum {maxFiles} files ({uploadedFiles.length}/{maxFiles} uploaded)
            </p>
          </div>
        </div>

        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
              <span className="text-sm text-gray-600">Uploading...</span>
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
            <div className="text-sm text-red-700">{error}</div>
          </div>
        </div>
      )}

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-900">Uploaded Files</h4>
          <div className="space-y-2">
            {uploadedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <File className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{file.name}</p>
                    <p className="text-xs text-gray-500">
                      {file.size > 0 ? formatFileSize(file.size) : 'Existing file'}
                      {file.type !== 'existing' && (
                        <span className="ml-2 inline-flex items-center">
                          <Check className="h-3 w-3 text-green-500 mr-1" />
                          Uploaded
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  title="Remove file"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}