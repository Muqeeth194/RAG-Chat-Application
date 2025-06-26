import PDFUploader from './components/PDFUploader'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ChatPage from './components/ChatPage'

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<PDFUploader />} />
        <Route path="/chat/:pdfId" element={<ChatPage />} />
      </Routes>
    </Router>
  )
}

export default App
