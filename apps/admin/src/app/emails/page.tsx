"use client";
import { useState, useEffect } from 'react';
// Importar solo desde client.ts para evitar importar SMS (que requiere módulos de Node.js)
import { EMAIL_TEMPLATES, EMAIL_TEMPLATE_METADATA } from '@repo/notifications/src/client';

interface SentEmail {
  id: string;
  eventType: 'EMAIL_SENT' | 'EMAIL_FAILED';
  to: string;
  subject: string;
  messageId: string | null;
  provider: string;
  error: string | null;
  success: boolean;
  createdAt: string;
  processed: boolean;
  processedAt: string | null;
}

interface EmailStats {
  total: number;
  sent: number;
  failed: number;
  successRate: string;
  dailyChart: Array<{
    date: string;
    sent: number;
    failed: number;
    total: number;
  }>;
  byProvider: Array<{
    provider: string;
    count: number;
  }>;
}

type Tab = 'send' | 'templates' | 'history' | 'stats';

export default function EmailsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('send');
  
  // Estado para envío de prueba
  const [selectedTemplate, setSelectedTemplate] = useState<string>('email-verification');
    const [recipient, setRecipient] = useState<string>('');
    const [variables, setVariables] = useState<string>('{}');
    const [status, setStatus] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
  
  // Estado para plantillas y previsualizador
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Estado para editor de plantillas
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editingTemplate, setEditingTemplate] = useState<string>('');
  const [templateContent, setTemplateContent] = useState<{
    subject: string;
    html: string;
    variables: string[];
  }>({ subject: '', html: '', variables: [] });
  const [saveLoading, setSaveLoading] = useState<boolean>(false);
  
  // Estado para historial
  const [sentEmails, setSentEmails] = useState<SentEmail[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historySearch, setHistorySearch] = useState('');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'EMAIL_SENT' | 'EMAIL_FAILED'>('all');
  
  // Estado para estadísticas
  const [stats, setStats] = useState<EmailStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Cargar historial
  const loadHistory = async (page = 1, search = '', filter = 'all') => {
    setHistoryLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(search && { search }),
        ...(filter !== 'all' && { eventType: filter }),
      });
      
      const res = await fetch(`/api/admin/emails/sent?${params}`, {
        credentials: 'include',
      });
      
      if (!res.ok) throw new Error('Error al cargar historial');
      
      const json = await res.json();
      if (json.success) {
        setSentEmails(json.data.emails);
        setHistoryTotal(json.data.pagination.total);
        setHistoryPage(json.data.pagination.page);
      }
    } catch (err) {
      console.error('Error cargando historial:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Cargar estadísticas
  const loadStats = async () => {
    setStatsLoading(true);
    try {
      const res = await fetch('/api/admin/emails/stats', {
        credentials: 'include',
      });
      
      if (!res.ok) throw new Error('Error al cargar estadísticas');
      
      const json = await res.json();
      if (json.success) {
        setStats(json.data);
      }
    } catch (err) {
      console.error('Error cargando estadísticas:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  // Cargar datos cuando cambia el tab
  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory(1, historySearch, historyFilter);
    } else if (activeTab === 'stats') {
      loadStats();
    }
  }, [activeTab]);

    const handleSend = async () => {
        if (!recipient) {
            alert('Ingrese el email del destinatario');
            return;
        }
        let vars = {};
        try {
            vars = JSON.parse(variables);
        } catch (e) {
            alert('Variables JSON no válidas');
            return;
        }
        setLoading(true);
        setStatus('Enviando...');
        try {
            const res = await fetch('/api/emails/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ template: selectedTemplate, to: recipient, variables: vars }),
            });
            const json = await res.json();
            if (res.ok) {
        setStatus(`✅ Email enviado exitosamente. ID: ${json.messageId || 'N/A'}`);
        // Recargar historial si está en esa pestaña
        if (activeTab === 'history') {
          loadHistory(historyPage, historySearch, historyFilter);
        }
        if (activeTab === 'stats') {
          loadStats();
        }
            } else {
        setStatus(`❌ Error: ${json.error || 'Desconocido'}`);
            }
        } catch (err) {
            console.error(err);
      setStatus('❌ Error al enviar');
        } finally {
            setLoading(false);
        }
    };

  const handleHistorySearch = () => {
    loadHistory(1, historySearch, historyFilter);
  };

  // Función para previsualizar plantilla
  const previewTemplate = async (templateKey: string, vars: any = {}) => {
    console.log('🧪 [PREVIEW] Iniciando preview para:', templateKey, vars);
    setPreviewLoading(true);
    try {
      const res = await fetch('/api/admin/emails/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          template: templateKey, 
          variables: vars 
        }),
      });
      
      console.log('🧪 [PREVIEW] Response status:', res.status);
      
      const json = await res.json();
      console.log('🧪 [PREVIEW] Response JSON:', json);
      
      if (!res.ok) {
        const errorMsg = json.error || json.message || `HTTP ${res.status}`;
        throw new Error(`Error al generar preview: ${errorMsg}`);
      }
      
      if (json.success) {
        console.log('✅ [PREVIEW] Preview generado exitosamente');
        setPreviewHtml(json.data.html);
      } else {
        const errorMsg = json.error || 'No se pudo generar el preview';
        console.error('❌ [PREVIEW] Error en respuesta:', errorMsg);
        setPreviewHtml(`<p style="color: red; padding: 20px; background: #fee; border: 1px solid #fcc; border-radius: 4px;">Error: ${errorMsg}</p>`);
      }
    } catch (err) {
      console.error('❌ [PREVIEW] Error previsualizando plantilla:', err);
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
      setPreviewHtml(`<p style="color: red; padding: 20px; background: #fee; border: 1px solid #fcc; border-radius: 4px;">Error al cargar preview: ${errorMsg}</p>`);
    } finally {
      setPreviewLoading(false);
    }
  };

  // Función para obtener variables de ejemplo para una plantilla
  const getExampleVariables = (templateKey: string) => {
    const examples: Record<string, any> = {
      'email-verification': {
        firstName: 'Juan',
        verificationUrl: 'https://polideportivovictoriahernandez.es/verify?token=abc123'
      },
      'password-reset': {
        firstName: 'María',
        resetUrl: 'https://polideportivovictoriahernandez.es/reset?token=def456',
        expirationTime: '24 horas'
      },
      'reservationConfirmation': {
        userName: 'Carlos García',
        courtName: 'Cancha de Tenis 1',
        date: new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString('es-ES'),
        startTime: '10:00',
        endTime: '11:00',
        duration: '60',
        price: '15.00',
        reservationCode: 'RES123456',
        qrCodeDataUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=RES123456',
        accessPassUrl: 'https://polideportivovictoriahernandez.es/reservations/pass/123',
        googleCalendarUrl: 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=Reserva+Polideportivo'
      },
      'membershipExpiring': {
        firstName: 'Ana',
        membershipType: 'Premium',
        expirationDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('es-ES'),
        renewUrl: 'https://polideportivovictoriahernandez.es/memberships/renew'
      }
    };
    
    return examples[templateKey] || { firstName: 'Usuario', message: 'Contenido de ejemplo' };
  };

  // Filtrar plantillas por categoría
  const getFilteredTemplates = () => {
    const templates = Object.entries(EMAIL_TEMPLATE_METADATA);
    if (selectedCategory === 'all') return templates;
    return templates.filter(([_, meta]) => meta.category === selectedCategory);
  };

  // Obtener categorías únicas
  const getCategories = () => {
    const categories = new Set(Object.values(EMAIL_TEMPLATE_METADATA).map(meta => meta.category));
    return Array.from(categories).sort();
  };

  // Función para cargar plantilla para edición
  const loadTemplateForEdit = async (templateKey: string) => {
    try {
      const res = await fetch(`/api/admin/emails/templates/${templateKey}`, {
        credentials: 'include',
      });
      
      if (!res.ok) throw new Error('Error al cargar plantilla');
      
      const json = await res.json();
      if (json.success) {
        setTemplateContent({
          subject: json.data.subject,
          html: json.data.html,
          variables: json.data.variables || []
        });
        setEditingTemplate(templateKey);
        setIsEditing(true);
      }
    } catch (err) {
      console.error('Error cargando plantilla para editar:', err);
      alert('Error al cargar la plantilla para edición');
    }
  };

  // Función para guardar plantilla editada
  const saveTemplate = async () => {
    if (!editingTemplate) return;
    
    setSaveLoading(true);
    try {
      const res = await fetch(`/api/admin/emails/templates/${editingTemplate}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          subject: templateContent.subject,
          html: templateContent.html,
          variables: templateContent.variables
        }),
      });
      
      if (!res.ok) throw new Error('Error al guardar plantilla');
      
      const json = await res.json();
      if (json.success) {
        alert('Plantilla guardada exitosamente');
        setIsEditing(false);
        setEditingTemplate('');
        // Refrescar preview si es la misma plantilla
        if (selectedTemplate === editingTemplate) {
          const exampleVars = getExampleVariables(editingTemplate);
          previewTemplate(editingTemplate, exampleVars);
        }
      } else {
        throw new Error(json.error || 'Error al guardar');
      }
    } catch (err) {
      console.error('Error guardando plantilla:', err);
      alert('Error al guardar la plantilla: ' + (err instanceof Error ? err.message : 'Error desconocido'));
    } finally {
      setSaveLoading(false);
    }
  };

  // Función para cancelar edición
  const cancelEdit = () => {
    setIsEditing(false);
    setEditingTemplate('');
    setTemplateContent({ subject: '', html: '', variables: [] });
  };

    return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Gestor de Emails</h1>
      
      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('send')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'send'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Enviar Prueba
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'templates'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Plantillas
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'history'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Historial
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'stats'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Estadísticas
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'send' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Enviar Email de Prueba</h2>
          <div className="space-y-4 max-w-2xl">
                <label className="block">
              <span className="text-gray-700 font-medium">Plantilla</span>
                    <select
                        value={selectedTemplate}
                onChange={e => {
                  setSelectedTemplate(e.target.value);
                  // Auto-llenar variables de ejemplo
                  const exampleVars = getExampleVariables(e.target.value);
                  setVariables(JSON.stringify(exampleVars, null, 2));
                }}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                {Object.entries(EMAIL_TEMPLATE_METADATA).map(([templateKey, meta]) => (
                  <option key={templateKey} value={templateKey}>
                    {meta.name} - {meta.description}
                  </option>
                        ))}
                    </select>
              {EMAIL_TEMPLATE_METADATA[selectedTemplate as keyof typeof EMAIL_TEMPLATE_METADATA] && (
                <div className="mt-2 p-3 bg-blue-50 rounded-md">
                  <p className="text-sm text-blue-800">
                    <strong>Variables disponibles:</strong> {EMAIL_TEMPLATE_METADATA[selectedTemplate as keyof typeof EMAIL_TEMPLATE_METADATA].variables.join(', ')}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Categoría: {EMAIL_TEMPLATE_METADATA[selectedTemplate as keyof typeof EMAIL_TEMPLATE_METADATA].category}
                  </p>
                </div>
              )}
                </label>
                <label className="block">
              <span className="text-gray-700 font-medium">Destinatario</span>
                    <input
                        type="email"
                        value={recipient}
                        onChange={e => setRecipient(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="ejemplo@correo.com"
                    />
                </label>
                <label className="block">
              <span className="text-gray-700 font-medium">Variables (JSON)</span>
                    <textarea
                rows={6}
                        value={variables}
                        onChange={e => setVariables(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 font-mono text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder='{"firstName": "Juan", "verificationUrl": "https://..."}'
                    />
                </label>
                <button
                    onClick={handleSend}
                    disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                    {loading ? 'Enviando...' : 'Enviar Email de Prueba'}
                </button>
            {status && (
              <div className={`p-3 rounded-md ${
                status.includes('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
              }`}>
                <p className="text-sm">{status}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'templates' && (
        <div className="space-y-6">
          {/* Filtros */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex gap-4 items-center mb-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Filtrar por categoría</label>
                <select
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">Todas las categorías</option>
                  {getCategories().map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Lista de plantillas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Panel izquierdo - Lista de plantillas */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold">Plantillas Disponibles</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {getFilteredTemplates().length} plantillas
                </p>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {getFilteredTemplates().map(([templateKey, meta]) => (
                  <div
                    key={templateKey}
                    className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                      selectedTemplate === templateKey ? 'bg-blue-50 border-blue-200' : ''
                    }`}
                    onClick={() => {
                      setSelectedTemplate(templateKey);
                      const exampleVars = getExampleVariables(templateKey);
                      previewTemplate(templateKey, exampleVars);
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{meta.name}</h4>
                        <p className="text-sm text-gray-600 mt-1">{meta.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="inline-block px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                            {meta.category}
                          </span>
                          <span className="text-xs text-gray-500">
                            {meta.variables.length} variables
                          </span>
                        </div>
                      </div>
                      <div className="ml-2 flex items-center gap-2">
                        {selectedTemplate === templateKey && (
                          <div className="text-blue-600">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            loadTemplateForEdit(templateKey);
                          }}
                          className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Editar plantilla"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Panel derecho - Preview */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold">Vista Previa</h3>
                {selectedTemplate && EMAIL_TEMPLATE_METADATA[selectedTemplate as keyof typeof EMAIL_TEMPLATE_METADATA] && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-600">
                      {EMAIL_TEMPLATE_METADATA[selectedTemplate as keyof typeof EMAIL_TEMPLATE_METADATA].name}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {EMAIL_TEMPLATE_METADATA[selectedTemplate as keyof typeof EMAIL_TEMPLATE_METADATA].variables.map(variable => (
                        <span key={variable} className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                          {variable}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="p-6">
                {previewLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-gray-600">Generando preview...</span>
                  </div>
                ) : previewHtml ? (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
                      <span className="text-xs font-medium text-gray-600">Vista previa del email</span>
                    </div>
                    <div 
                      className="p-4 max-h-96 overflow-y-auto"
                      dangerouslySetInnerHTML={{ __html: previewHtml }}
                    />
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <p className="mt-2">Selecciona una plantilla para ver la vista previa</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
                <input
                  type="text"
                  value={historySearch}
                  onChange={e => setHistorySearch(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && handleHistorySearch()}
                  placeholder="Buscar por destinatario o asunto..."
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="w-48">
                <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                <select
                  value={historyFilter}
                  onChange={e => {
                    setHistoryFilter(e.target.value as any);
                    loadHistory(1, historySearch, e.target.value as any);
                  }}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">Todos</option>
                  <option value="EMAIL_SENT">Enviados</option>
                  <option value="EMAIL_FAILED">Fallidos</option>
                </select>
              </div>
              <button
                onClick={handleHistorySearch}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
              >
                Buscar
              </button>
            </div>
          </div>
          
          {historyLoading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Cargando historial...</p>
            </div>
          ) : sentEmails.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <p>No se encontraron emails en el historial</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Destinatario</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asunto</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Proveedor</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sentEmails.map((email) => (
                      <tr key={email.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            email.success
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {email.success ? '✓ Enviado' : '✗ Fallido'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{email.to}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div className="max-w-md truncate" title={email.subject}>
                            {email.subject}
                          </div>
                          {email.error && (
                            <div className="text-xs text-red-600 mt-1">Error: {email.error}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{email.provider}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(email.createdAt).toLocaleString('es-ES')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Paginación */}
              {historyTotal > 20 && (
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Mostrando {((historyPage - 1) * 20) + 1} a {Math.min(historyPage * 20, historyTotal)} de {historyTotal} emails
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => loadHistory(historyPage - 1, historySearch, historyFilter)}
                      disabled={historyPage === 1}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Anterior
                    </button>
                    <button
                      onClick={() => loadHistory(historyPage + 1, historySearch, historyFilter)}
                      disabled={historyPage * 20 >= historyTotal}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'stats' && (
        <div className="space-y-6">
          {statsLoading ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Cargando estadísticas...</p>
            </div>
          ) : stats ? (
            <>
              {/* Cards de resumen */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-sm font-medium text-gray-500">Total Enviados</div>
                  <div className="mt-2 text-3xl font-bold text-gray-900">{stats.total}</div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-sm font-medium text-gray-500">Exitosos</div>
                  <div className="mt-2 text-3xl font-bold text-green-600">{stats.sent}</div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-sm font-medium text-gray-500">Fallidos</div>
                  <div className="mt-2 text-3xl font-bold text-red-600">{stats.failed}</div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-sm font-medium text-gray-500">Tasa de Éxito</div>
                  <div className="mt-2 text-3xl font-bold text-blue-600">{stats.successRate}%</div>
                </div>
              </div>

              {/* Gráfico diario */}
              {stats.dailyChart.length > 0 ? (
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4">Envíos por Día (Últimos 14 días)</h3>
                  <div className="space-y-3">
                    {stats.dailyChart.slice(-14).map((day) => {
                      const maxEmails = Math.max(...stats.dailyChart.map(d => d.total));
                      const barWidth = maxEmails > 0 ? (day.total / maxEmails) * 100 : 0;
                      const successRate = day.total > 0 ? (day.sent / day.total) * 100 : 0;
                      
                      return (
                        <div key={day.date} className="flex items-center gap-4">
                          <div className="w-20 text-sm text-gray-600 font-medium">
                            {new Date(day.date).toLocaleDateString('es-ES', { 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </div>
                          
                          {/* Barra de progreso proporcional */}
                          <div className="flex-1 flex items-center gap-3">
                            <div 
                              className="bg-gray-100 rounded-full h-8 relative overflow-hidden border"
                              style={{ width: `${Math.max(barWidth, 10)}%` }}
                            >
                              {/* Parte exitosa (verde) */}
                              <div
                                className="absolute left-0 top-0 h-full bg-green-500 transition-all duration-300"
                                style={{ width: `${successRate}%` }}
                              />
                              {/* Parte fallida (roja) */}
                              {day.failed > 0 && (
                                <div
                                  className="absolute top-0 h-full bg-red-500 transition-all duration-300"
                                  style={{ 
                                    left: `${successRate}%`,
                                    width: `${100 - successRate}%` 
                                  }}
                                />
                              )}
                              
                              {/* Texto dentro de la barra */}
                              {day.total > 0 && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <span className="text-xs font-semibold text-white drop-shadow">
                                    {day.total}
                                  </span>
                                </div>
                              )}
                            </div>
                            
                            {/* Estadísticas detalladas */}
                            <div className="w-32 text-sm">
                              <div className="flex items-center gap-2">
                                <span className="text-green-600 font-medium">
                                  ✓ {day.sent}
                                </span>
                                {day.failed > 0 && (
                                  <span className="text-red-600 font-medium">
                                    ✗ {day.failed}
                                  </span>
                                )}
                              </div>
                              {day.total > 0 && (
                                <div className="text-xs text-gray-500">
                                  {successRate.toFixed(1)}% éxito
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Leyenda */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-center gap-6 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded"></div>
                        <span>Emails exitosos</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded"></div>
                        <span>Emails fallidos</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-gray-100 border rounded"></div>
                        <span>Volumen relativo</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4">Envíos por Día</h3>
                  <div className="text-center py-8 text-gray-500">
                    <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <p>No hay datos de envíos para mostrar</p>
                    <p className="text-sm mt-1">Envía algunos emails de prueba para ver las estadísticas</p>
                  </div>
                </div>
              )}

              {/* Por proveedor */}
              {stats.byProvider.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4">Envíos por Proveedor</h3>
                  <div className="space-y-3">
                    {stats.byProvider.map((provider) => (
                      <div key={provider.provider} className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700 capitalize">{provider.provider}</span>
                        <span className="text-sm text-gray-600">{provider.count} emails</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
              <p>No hay estadísticas disponibles</p>
            </div>
          )}
        </div>
      )}

      {/* Modal de edición de plantillas */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 px-4 py-6">
          <div className="bg-white rounded-2xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Editar Plantilla: {EMAIL_TEMPLATE_METADATA[editingTemplate as keyof typeof EMAIL_TEMPLATE_METADATA]?.name}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {EMAIL_TEMPLATE_METADATA[editingTemplate as keyof typeof EMAIL_TEMPLATE_METADATA]?.description}
                </p>
              </div>
              <button 
                onClick={cancelEdit} 
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden flex">
              {/* Editor Panel */}
              <div className="w-1/2 p-6 border-r border-gray-200 overflow-y-auto">
                <div className="space-y-4">
                  {/* Subject */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Asunto del Email
                    </label>
                    <input
                      type="text"
                      value={templateContent.subject}
                      onChange={e => setTemplateContent(prev => ({ ...prev, subject: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Asunto del email..."
                    />
                  </div>

                  {/* HTML Content */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contenido HTML
                    </label>
                    <textarea
                      rows={20}
                      value={templateContent.html}
                      onChange={e => setTemplateContent(prev => ({ ...prev, html: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="<div>Contenido HTML...</div>"
                    />
                  </div>

                  {/* Variables */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Variables Disponibles
                    </label>
                    <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-md">
                      {templateContent.variables.map(variable => (
                        <span key={variable} className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                          {`{{${variable}}}`}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Usa estas variables en el HTML con el formato {`{{nombreVariable}}`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Preview Panel */}
              <div className="w-1/2 p-6 overflow-y-auto bg-gray-50">
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Vista Previa en Tiempo Real</h4>
                  <button
                    onClick={() => {
                      const exampleVars = getExampleVariables(editingTemplate);
                      // Preview temporal con el contenido editado
                      let tempHtml = templateContent.html;
                      Object.entries(exampleVars).forEach(([key, value]) => {
                        const placeholder = `{{${key}}}`;
                        tempHtml = tempHtml.replace(new RegExp(placeholder, 'g'), String(value));
                      });
                      setPreviewHtml(`<div style="font-family: Arial, sans-serif; color: #000000; line-height: 1.6; background-color: #ffffff; padding: 20px;">${tempHtml}</div>`);
                    }}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Actualizar Preview
                  </button>
                </div>
                
                <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                  <div className="bg-gray-100 px-3 py-2 border-b border-gray-200">
                    <span className="text-xs font-medium text-gray-600">
                      Asunto: {templateContent.subject || 'Sin asunto'}
                    </span>
                  </div>
                  <div 
                    className="p-4 min-h-[300px]"
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={cancelEdit}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={saveTemplate}
                disabled={saveLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saveLoading ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
            </div>
        </div>
      )}
        </div>
    );
}
