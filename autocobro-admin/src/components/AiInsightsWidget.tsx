import { useState, useEffect } from 'react'
import { Sparkles, MessageSquare, Send, X, Lightbulb, TrendingUp, TrendingDown, Package, AlertTriangle } from 'lucide-react'

const API_URL = 'http://localhost:4000/api'

interface AiInsightsProps {
  token: string
}

export function AiInsightsWidget({ token }: AiInsightsProps) {
  const [insights, setInsights] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [chatOpen, setChatOpen] = useState(false)
  const [messages, setMessages] = useState<{role: string, content: string}[]>([])
  const [input, setInput] = useState('')

  const fetchInsights = async () => {
    try {
      const res = await fetch(`${API_URL}/ai/insights`, { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (data.success) setInsights(data.data)
    } catch (err) { console.error('Failed to fetch AI insights:', err) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchInsights() }, [token])

  const sendChat = async () => {
    if (!input.trim()) return
    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    try {
      const res = await fetch(`${API_URL}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ messages: [...messages, { role: 'user', content: userMessage }] })
      })
      const data = await res.json()
      if (data.success) setMessages(prev => [...prev, { role: 'assistant', content: data.data.response }])
    } catch (err) { console.error('Failed to send chat:', err) }
  }

  const formatCurrency = (v: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v)

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-bold text-gray-800">AI Insights</h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-12 bg-gray-200 rounded-lg animate-pulse" />)}
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl shadow p-6 border border-purple-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-500 rounded-lg">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-800">AI Insights</h3>
          </div>
          <button onClick={() => setChatOpen(true)} className="p-2 hover:bg-purple-100 rounded-lg transition-colors">
            <MessageSquare className="w-5 h-5 text-purple-600" />
          </button>
        </div>

        {insights?.insights?.map((insight: any, i: number) => (
          <div key={i} className="flex items-center justify-between py-3 border-b border-purple-100 last:border-0">
            <div>
              <p className="text-sm text-gray-500">{insight.title}</p>
              <p className="text-xl font-bold text-gray-800">
                {insight.format === 'currency' ? formatCurrency(insight.value) : insight.value}
              </p>
            </div>
            {insight.trend && (
              insight.trend === 'up' 
                ? <TrendingUp className="w-5 h-5 text-green-500" />
                : <TrendingDown className="w-5 h-5 text-red-500" />
            )}
          </div>
        ))}

        {insights?.recommendations?.length > 0 && (
          <div className="mt-4 pt-4 border-t border-purple-100">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-4 h-4 text-yellow-500" />
              <span className="font-medium text-gray-700">Recomendaciones</span>
            </div>
            <div className="space-y-2">
              {insights.recommendations.map((rec: any, i: number) => (
                <div key={i} className={`p-3 rounded-lg text-sm ${rec.type === 'inventory' ? 'bg-orange-50 text-orange-700' : 'bg-green-50 text-green-700'}`}>
                  <div className="flex items-start gap-2">
                    {rec.type === 'inventory' ? <AlertTriangle className="w-4 h-4 mt-0.5" /> : <TrendingUp className="w-4 h-4 mt-0.5" />}
                    <span>{rec.message}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {insights?.lowStock?.length > 0 && (
          <div className="mt-4 pt-4 border-t border-purple-100">
            <div className="flex items-center gap-2 mb-2">
              <Package className="w-4 h-4 text-red-500" />
              <span className="font-medium text-gray-700">Stock Bajo</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {insights.lowStock.map((item: any, i: number) => (
                <span key={i} className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">
                  {item.name} ({item.stock})
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {chatOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg h-[500px] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <span className="font-bold text-gray-800">Asistente AI</span>
              </div>
              <button onClick={() => setChatOpen(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  Hola! Soy tu asistente de ventas. Pregúntame sobre métricas, productos o tendencias.
                </p>
              ) : (
                messages.map((m, i) => (
                  <div key={i} className={`p-3 rounded-lg ${m.role === 'user' ? 'bg-blue-100 ml-8' : 'bg-gray-100 mr-8'}`}>
                    <p className="text-sm">{m.content}</p>
                  </div>
                ))
              )}
            </div>
            <div className="p-4 border-t flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendChat()}
                placeholder="Escribe tu pregunta..."
                className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button onClick={sendChat} className="p-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600">
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}