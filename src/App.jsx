import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import UploadPage from './pages/UploadPage'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LogoPage from './pages/LogoPage';

function App() {
  const [count, setCount] = useState(0)

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<UploadPage />} />
        <Route path="/logo" element={<LogoPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
