// Imports
import * as React from 'react';
import { useState, useRef } from 'react';
import type { FC } from 'react';
import { ArrowLeft, MapPin, Image as ImageIcon } from 'lucide-react';
import './UploadPage.css';
import { useNavigate, useParams } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import axios from 'axios';
import './style.css'

// UploadPage component
const UploadPage: FC = () => {
  // --- State ---
  const navigate = useNavigate();
  const { bucketname } = useParams();
  const [issueLocation, setIssueLocation] = useState('');
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [additionalNotes, setAdditionalNotes] = useState('');
  // Update uploadedPhotos state type (remove progress)
  const [uploadedPhotos, setUploadedPhotos] = useState<{
    file: File;
    signedUrl: string;
    fileUrl: string;
    progress: number;
  }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showLoader, setShowLoader] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({ open: false, message: '' });
  const [showSuccessTick, setShowSuccessTick] = useState(false);

  // --- Handlers ---
  function handleApiError(body: any, setSnackbar: any, navigate: any) {
    if (body.statusCode === 200) return false;
    if (body.statusCode === 401 || body.statusCode === 403 || body.statusCode === 400) {
      let errorMsg = 'Otp expired';
      if (body.body) {
        let parsed = typeof body.body === 'string' ? JSON.parse(body.body) : body.body;
        if (parsed.error) errorMsg = parsed.error;
      }
      // Check for bucket error
      if (typeof errorMsg === 'string' && errorMsg.toLowerCase().includes('bucket')) {
        errorMsg = 'Incorrect bucket name. Please check and try again.';
      }
      setSnackbar({ open: true, message: errorMsg });
      navigate('/otp', { replace: true });
      throw new Error(errorMsg);
    }
    return false;
  }

  const getSignedUrl = async (file: File) => {
    const res = await fetch('https://bpshrp37ol.execute-api.us-east-1.amazonaws.com/v1/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          path: "/upload-url",
          bucketname: bucketname,
          body: {
            filename: file.name,
            filetype: file.type,
            
          },
          httpMethod: "POST"
        }),
      });
    const data = await res.json();
    console.log(data);
    
    let body = typeof data.body === 'string' ? JSON.parse(data.body) : data.body;
    handleApiError(data, setSnackbar, navigate);
    return { signedUrl: body.signedUrl, fileUrl: body.fileUrl };
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter(file => file.size <= 10 * 1024 * 1024); // 10MB
    if (validFiles.length !== files.length) {
      setSnackbar({ open: true, message: "Some images were too large (max 10MB). Only smaller images are accepted." });
    }
    // Only get signed URLs for each valid file, do not upload yet
    const photoObjs = await Promise.all(validFiles.map(async (file) => {
      const res = await fetch('https://bpshrp37ol.execute-api.us-east-1.amazonaws.com/v1/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: "/upload-url",
          bucketname: bucketname,
          body: {
            filename: file.name,
            filetype: file.type,
          },
          httpMethod: "POST"
        }),
      });
      const responseEvent = await res.json();
      console.log(responseEvent);
      
      const body = typeof responseEvent.body === 'string'
        ? JSON.parse(responseEvent.body)
        : responseEvent.body;
      return { file, signedUrl: body.signedUrl, fileUrl: body.fileUrl, progress: 0 };
    }));
    setUploadedPhotos(prev => [...prev, ...photoObjs.filter(Boolean)]);
  };

  const handleLocationChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setIssueLocation(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const detectCurrentLocation = () => {
    setLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`
          );
          const data = await response.json();
          const address = data?.display_name;
          if (address) {
            setIssueLocation(address);
          } else {
            setIssueLocation(`${data?.address?.suburb || ''} ${data?.address?.city || ''} ${data?.address?.state || ''}`);
          }
        } catch (error) {
          setSnackbar({ open: true, message: 'Reverse geocoding failed.' });
          setIssueLocation(`${latitude}, ${longitude}`);
        } finally {
          setLoadingLocation(false);
        }
      },
      (error) => {
        setSnackbar({ open: true, message: 'Unable to access location. Please enable GPS.' });
        setLoadingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // handleFinalUpload: just use uploaded fileUrls, do not upload to S3 again
  const handleFinalUpload = async () => {
    setIsUploading(true);
    setSuccessMessage('');
    setShowLoader(true);
    setShowSuccessTick(false);
    try {
      await Promise.all(
        uploadedPhotos.map(async (photoObj, idx) => {
          await axios.put(photoObj.signedUrl, photoObj.file, {
            headers: { 'Content-Type': photoObj.file.type },
            onUploadProgress: (progressEvent) => {
              if (progressEvent.total) {
                const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                setUploadedPhotos(prev => {
                  const updated = [...prev];
                  updated[idx] = { ...updated[idx], progress: percent };
                  return updated;
                });
              }
            }
          });
          setUploadedPhotos(prev => {
            const updated = [...prev];
            updated[idx] = { ...updated[idx], progress: 100 };
            return updated;
          });
        })
      );
      // After successful upload, call the same signed URL endpoint with DELETE method and no body for each photo
      // const deleteRes = await Promise.all(
      //   uploadedPhotos.map(async (photoObj) => {
      //     const res = await fetch('https://bpshrp37ol.execute-api.us-east-1.amazonaws.com/v1/', {
      //       method: 'POST',
      //       headers: { 'Content-Type': 'application/json' },
      //       body: JSON.stringify({
      //         path: "/delete",
      //         httpMethod: "DELETE"
      //       }),
      //     });
      //     let resBody;
      //     try {
      //       resBody = await res.json();
      //     } catch {
      //       resBody = await res.text();
      //     }
      //     console.log('Delete response:', { status: res.status, body: resBody });
      //     return { status: res.status, body: resBody };
      //   })
      // );
      // console.log("deleteRes", deleteRes);

      // Now you can use uploadedPhotos.map(p => p.fileUrl) as the S3 URLs
      setUploadedPhotos([]);
      setSuccessMessage('Files uploaded successfully!');
      setAdditionalNotes('');
      setIsUploading(false);
      setShowSuccessTick(true);
      setTimeout(() => {
        setShowLoader(false);
        setShowSuccessTick(false);
      }, 2000);
    } catch (err: any) {
      setIsUploading(false);
      setShowLoader(false);
      let msg = err?.message || 'Upload failed. Please try again.';
      if (typeof msg === 'string' && msg.toLowerCase().includes('bucket')) {
        msg = 'Incorrect bucket name. Please check and try again.';
      }
      setSnackbar({ open: true, message: msg });
    }
  };

  // Snackbar close handler
  const closeSnackbar = () => setSnackbar({ open: false, message: '' });

  const HEADER_GRADIENT = 'linear-gradient(90deg, #ff914d 0%, #794585 100%)';
  const FOOTER_COLOR = '#263588';

  // --- Render ---
  return (
    <div className="main-bg-container" style={{ minHeight: '90vh', background: 'linear-gradient(120deg, #fff7f0 0%, #f3eaff 100%)', display: 'flex', flexDirection: 'column' }}>
      <div
        className='c1'
      />
      {/* Bottom Left Pink/Purple/Blue Blob */}
      <div
        className='c2'
      />
      {/* Right Bottom Blue Blob */}
      <div
        className='c3'
      />
      {/* Header */}
      <header style={{
        width: '100%',
        padding: '10px 0 8px 0',
        background: HEADER_GRADIENT,
        color: 'white',
        textAlign: 'center',
        fontWeight: 700,
        fontSize: 24,
        letterSpacing: 1,
        boxShadow: '0 2px 8px rgba(121, 69, 133, 0.08)'
      }}>
        <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: 26 }}>Upload</span>
      </header>

      {/* Main Content */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '0',
        }}
      >
        <div
          style={{
            borderRadius: 0,
            boxShadow: 'none',
            padding: '3vw 6vw',
            width: '100%',
            maxWidth: '100%',
            minWidth: 0,
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
          className="responsive-card"
        >
          {/* Form Container */}
          <div className="form-container" style={{ background: 'none', boxShadow: 'none', padding: 0, maxWidth: 'unset', margin: 0, position: 'static' }}>
            {/* Header with language selection */}
            
            <form onSubmit={handleSubmit} className="form">
              {/* Information Upload Header */}
              <div className="form-header" style={{ marginBottom: 10 }}>
                <h2 className="form-title" style={{ fontSize: 18, margin: 0 }}>Information Upload</h2>
              </div>
              {/* Upload Photo Section */}
              <div className="form-field" style={{ marginBottom: 12 }}>
                <label className="form-label" style={{ marginBottom: 4 }}>Upload Photos (max 10 MB each)</label>
                <div onClick={() => photoInputRef.current?.click()} className="upload-container">
                  <div className="upload-content">
                    <ImageIcon />
                    <span className="upload-text">Click to upload photos</span>
                  </div>
                </div>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  className="upload-input"
                />
                <div className="preview-grid">
                  {uploadedPhotos.map(({ file }, index) => (
                    <div className="preview-wrapper" key={index}>
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`upload-${index}`}
                        className="preview-image"
                      />
                      <button
                        className="remove-button"
                        type="button"
                        onClick={() => {
                          setUploadedPhotos(prev => prev.filter((_, i) => i !== index));
                        }}
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              {/* Additional Notes Section */}
              <div className="form-field" style={{ marginBottom: 12 }}>
                <label className="form-label" style={{ marginBottom: 4 }}>Additional Notes</label>
                <div className="notes-container">
                  <textarea
                    value={additionalNotes}
                    onChange={(e) => setAdditionalNotes(e.target.value)}
                    placeholder="Enter additional notes..."
                    className="notes-textarea"
                  />
                </div>
              </div>
              {/* Submit Button */}
              <button
                type="button"
                className="submit-button"
                onClick={handleFinalUpload}
                disabled={isUploading}
                style={{ marginTop: 8, marginBottom: 4, padding: '8px 0', fontSize: 15 }}
              >
                {isUploading ? 'Uploading...' : 'Submit'}
              </button>
              {successMessage && (
                <div className="success-message" style={{ marginTop: 6, fontSize: 15 }}>
                  {successMessage}
                </div>
              )}
            </form>
          </div>
          {/* Loader Overlay */}
          {showLoader && (
            <div className="loader-overlay">
              <div className="loader-content">
                {showSuccessTick ? (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 50 }}>
                      <svg width="50" height="50" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="30" cy="30" r="28" stroke="#263588" strokeWidth="4" fill="#f3f3f3" />
                        <path d="M18 32L27 41L43 23" stroke="#263588" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <p className="loader-text" style={{ color: '#263588', fontWeight: 600, fontSize: 18, fontFamily: 'Inter, sans-serif' }}>Upload successful!</p>
                  </>
                ) : (
                  <>
                    <div className="loader-spinner" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 50 }}></div>
                    <p className="loader-text" style={{ fontFamily: 'Inter, sans-serif' }}>Uploading your information...</p>
                    {/* Upload progress details */}
                    <div style={{ marginTop: '16px', textAlign: 'left', width: 280, fontFamily: 'Inter, sans-serif' }}>
                      {/* Photos Progress */}
                      {uploadedPhotos.length > 0 && (
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                            <span style={{ fontWeight: 'bold', color: '#263588', minWidth: 60 }}>Photos</span>
                            <span style={{ marginLeft: 'auto', fontWeight: 'bold', color: '#263588' }}>
                              {uploadedPhotos.length > 0 ? Math.round(uploadedPhotos.reduce((a, b) => a + b.progress, 0) / uploadedPhotos.length) : 0}%
                            </span>
                          </div>
                          <div style={{ width: '100%', height: 8, background: '#e5e7eb', borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{ width: `${uploadedPhotos.length > 0 ? Math.round(uploadedPhotos.reduce((a, b) => a + b.progress, 0) / uploadedPhotos.length) : 0}%`, height: '100%', background: '#263588', transition: 'width 0.3s' }}></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
          {/* Snackbar Popup */}
          {snackbar.open && (
            <div style={{
              position: 'fixed',
              left: 0,
              right: 0,
              bottom: 0,
              margin: '0 auto',
              zIndex: 2000,
              width: 'fit-content',
              minWidth: 240,
              maxWidth: 400,
              background: '#323232',
              color: 'white',
              borderRadius: 8,
              padding: '16px 24px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              textAlign: 'center',
              fontSize: 16,
              marginBottom: 32,
              animation: 'fadeInUp 0.3s',
            }}
            onClick={closeSnackbar}
            >
              {snackbar.message}
            </div>
          )}
        </div>
      </div>
      {/* Footer */}
      <footer style={{
        width: '100%',
        background: FOOTER_COLOR,
        color: 'white',
        textAlign: 'center',
        padding: '10px 0 8px 0',
        fontSize: 14,
        fontFamily: 'Inter, sans-serif',
        letterSpacing: 0.5,
        marginTop: 'auto',
        boxShadow: '0 -2px 8px rgba(121, 69, 133, 0.08)'
      }}>
        &copy; {new Date().getFullYear()} The Thought Bulb. All rights reserved.
      </footer>
    </div>
  );
};

export default UploadPage;
