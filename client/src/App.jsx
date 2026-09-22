import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import heroImg from './assets/hero.png'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import './App.css'

function App() {
  // 1. Unified state variable for tracking credentials
  const [formData, setFormData] = useState({
    id: '',
    password: '',
    email:'',
  })

  // Status tracker to show feedback to your user
  const [statusMessage, setStatusMessage] = useState('')
  const [rstmsg, setResetStatus] = useState('')

  // 2. Dynamic input handler that updates tracking state as user types
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  // 3. Asynchronous registration request handler
  const wipeDB = async () => {
    try {
      // Points directly to the local backend port hosting your API routes
      const response = await fetch('http://localhost:5001/del_db', {
        method: 'DELETE',
      })

      const data = await response.json()
      setResetStatus("Database Cleared 🫪")

    }
    catch (error) {
      console.error('Network Error:', error)
      setStatusMessage('Network error. Is your backend server running?')
    }
  }

  const handleRegister = async (event) => {
    event.preventDefault() // Prevents fallback page reload
    setStatusMessage('Registering...')

    try {
      // Points directly to the local backend port hosting your API routes
      const response = await fetch('http://localhost:5001/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData) // Destructures seamlessly into req.body
      })

      const data = await response.json()

      if (response.ok) {
        setStatusMessage(`Successfully registered ${data.user.id}`)
        setFormData({ id: '', password: '',email:''}) // Clears inputs upon success
      } else {
        setStatusMessage(`Registration failed: ${data.message || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Network Error:', error)
      setStatusMessage('Network error. Is your backend server running?')
    }
  }

  return (
    <>
      <section id="center">
        <div>
          <h1>Create Account</h1>
          <p>
            Sign up below to access your development dashboard.
          </p>
        </div>
        {rstmsg && <p className="rst-msg">{rstmsg}</p>}
        <button onClick={wipeDB}>Reset DB</button>

        {/* 4. Registration form interface targeting onSubmit */}
        <form onSubmit={handleRegister} className="register-form">
          <div className="input-group">
            <input
              type="text"
              name="id"
              placeholder="Username or ID"
              value={formData.id}
              onChange={handleChange}
              required
            />
          </div>
          <div className="input-group">
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>
          <div className="input-group">
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <button type="submit" className="submit-btn">
            Register
          </button>
        </form>

        {statusMessage && <p className="status-msg">{statusMessage}</p>}
      </section>

      <div className="ticks"></div>

      <div className="ticks"></div>
      <section id="spacer"></section>
    </>
  )
}
export default App