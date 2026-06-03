'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('Credenciales incorrectas. Verifique su email y contraseña.')
      } else {
        router.push('/')
        router.refresh()
      }
    } catch {
      setError('Error al iniciar sesión. Intente de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1C3557 0%, #2a4d7a 100%)' }}>
      <div className="w-full max-w-md px-6">
        {/* Logo / Brand */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <div className="bg-white rounded-2xl p-4 shadow-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/citymall-logo.png" alt="CityMall" className="h-20 w-auto" />
            </div>
          </div>
          <p className="text-blue-200 mt-2 text-xs font-semibold uppercase tracking-widest">Sistema de Reportes</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold mb-1" style={{ color: '#1C3557' }}>Iniciar Sesión</h2>
          <p className="text-gray-500 text-sm mb-6">Ingrese sus credenciales de acceso</p>

          {error && (
            <div className="mb-4 p-3 rounded-lg text-sm font-medium" style={{ backgroundColor: '#fef2f2', color: '#D64440', border: '1px solid #fecaca' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: '#1C3557' }}>
                Correo Electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="usuario@citymall.com"
                className="w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all"
                style={{ borderColor: '#E8ECF0', color: '#1C3557' }}
                onFocus={(e) => { e.target.style.borderColor = '#F47920'; e.target.style.boxShadow = '0 0 0 3px rgba(244,121,32,0.1)' }}
                onBlur={(e) => { e.target.style.borderColor = '#E8ECF0'; e.target.style.boxShadow = 'none' }}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: '#1C3557' }}>
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all"
                style={{ borderColor: '#E8ECF0', color: '#1C3557' }}
                onFocus={(e) => { e.target.style.borderColor = '#F47920'; e.target.style.boxShadow = '0 0 0 3px rgba(244,121,32,0.1)' }}
                onBlur={(e) => { e.target.style.borderColor = '#E8ECF0'; e.target.style.boxShadow = 'none' }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-bold text-white text-sm transition-all disabled:opacity-70"
              style={{ backgroundColor: loading ? '#b85c14' : '#F47920' }}
              onMouseOver={(e) => { if (!loading) (e.target as HTMLElement).style.backgroundColor = '#e06a18' }}
              onMouseOut={(e) => { if (!loading) (e.target as HTMLElement).style.backgroundColor = '#F47920' }}
            >
              {loading ? 'Iniciando sesión...' : 'Ingresar al Sistema'}
            </button>
          </form>
        </div>

        <p className="text-center text-blue-300 text-xs mt-6">
          &copy; {new Date().getFullYear()} CityMall — Uso Interno
        </p>
      </div>
    </div>
  )
}
