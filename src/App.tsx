import React, { useState, useCallback } from 'react';
import { Upload, Microscope, Phone, Globe, FileText, AlertCircle, User, Calendar, Stethoscope } from 'lucide-react';
import { CellAnalyzer } from './utils/cellAnalysis';
import { CellAnalysisResult } from './types/analysis';
import Chat from './components/Chat';

const cellAnalyzer = new CellAnalyzer();

interface PatientInfo {
  name: string;
  age: string;
  gender: string;
  examDate: string;
  examType: string;
  sampleType: string;
  clinicalHistory: string;
  symptoms: string;
  previousExams: string;
  requestingDoctor: string;
  hospital: string;
}

export default function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<CellAnalysisResult | null>(null);
  const [showPatientForm, setShowPatientForm] = useState(false);
  const [patientInfo, setPatientInfo] = useState<PatientInfo>({
    name: '',
    age: '',
    gender: '',
    examDate: new Date().toISOString().split('T')[0],
    examType: '',
    sampleType: '',
    clinicalHistory: '',
    symptoms: '',
    previousExams: '',
    requestingDoctor: '',
    hospital: ''
  });

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
      setShowPatientForm(true);
    }
  }, []);

  const handlePatientInfoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setPatientInfo(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAnalyze = useCallback(async () => {
    if (!selectedFile || !isPatientInfoComplete()) {
      alert('Por favor, preencha todas as informações do paciente antes de prosseguir com a análise.');
      return;
    }
    
    setIsAnalyzing(true);
    try {
      const analysisResults = await cellAnalyzer.analyzeImage(selectedFile);
      setResults(analysisResults);
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [selectedFile, patientInfo]);

  const isPatientInfoComplete = () => {
    const requiredFields = ['name', 'age', 'gender', 'examType', 'sampleType'];
    return requiredFields.every(field => patientInfo[field as keyof PatientInfo]);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Microscope className="w-8 h-8 text-purple-600" />
            <h1 className="text-2xl font-bold text-gray-900">Análise Oncológica Celular</h1>
          </div>
          <div className="flex items-center space-x-4">
            <a
              href="https://likelook.wixsite.com/solutions"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 text-gray-600 hover:text-purple-600"
            >
              <Globe className="w-5 h-5" />
              <span className="hidden sm:inline">Like Look Solutions</span>
            </a>
            <a
              href="https://wa.me/5511970603441"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 text-gray-600 hover:text-green-600"
            >
              <Phone className="w-5 h-5" />
              <span className="hidden sm:inline">Contato</span>
            </a>
          </div>
        </div>
      </header>

      {/* Chat Component */}
      <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
        <Chat />
      </div>

      {/* Usage Instructions */}
      <div className="bg-purple-50 border-b border-purple-100">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-lg font-semibold text-purple-900 mb-3">Como Usar</h2>
              <ol className="space-y-2 text-purple-800">
                <li>1. Faça upload de uma imagem microscópica</li>
                <li>2. Preencha as informações do paciente</li>
                <li>3. Clique em "Analisar Células" para iniciar</li>
                <li>4. Visualize o relatório detalhado da análise</li>
              </ol>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-purple-900 mb-3">Arquivos Aceitos</h2>
              <ul className="space-y-2 text-purple-800">
                <li>• Imagens de Microscopia</li>
                <li>• Formatos: PNG, JPG, JPEG</li>
                <li>• Tamanho máximo: 10MB</li>
                <li>• Resolução mínima: 1024x1024 pixels</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload and Patient Info Section */}
          <div className="space-y-6">
            {/* Upload Section */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4">Upload da Imagem Microscópica</h2>
              
              {!previewUrl ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4">
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <span className="mt-2 block text-sm font-medium text-gray-900">
                        Clique para upload ou arraste a imagem
                      </span>
                      <input
                        id="file-upload"
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleFileSelect}
                      />
                    </label>
                    <p className="mt-1 text-xs text-gray-500">
                      PNG, JPG até 10MB
                    </p>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-auto rounded-lg"
                  />
                  <button
                    onClick={() => {
                      setPreviewUrl(null);
                      setSelectedFile(null);
                      setResults(null);
                      setShowPatientForm(false);
                    }}
                    className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>

            {/* Patient Information Form */}
            {showPatientForm && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Informações do Paciente
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Nome do Paciente</label>
                    <input
                      type="text"
                      name="name"
                      value={patientInfo.name}
                      onChange={handlePatientInfoChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Idade</label>
                    <input
                      type="number"
                      name="age"
                      value={patientInfo.age}
                      onChange={handlePatientInfoChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Gênero</label>
                    <select
                      name="gender"
                      value={patientInfo.gender}
                      onChange={handlePatientInfoChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                    >
                      <option value="">Selecione</option>
                      <option value="M">Masculino</option>
                      <option value="F">Feminino</option>
                      <option value="O">Outro</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Data do Exame</label>
                    <input
                      type="date"
                      name="examDate"
                      value={patientInfo.examDate}
                      onChange={handlePatientInfoChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Tipo de Exame</label>
                    <select
                      name="examType"
                      value={patientInfo.examType}
                      onChange={handlePatientInfoChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                    >
                      <option value="">Selecione</option>
                      <option value="citologia">Citologia</option>
                      <option value="biopsia">Biópsia</option>
                      <option value="aspirado">Aspirado</option>
                      <option value="outro">Outro</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Tipo de Amostra</label>
                    <select
                      name="sampleType"
                      value={patientInfo.sampleType}
                      onChange={handlePatientInfoChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                    >
                      <option value="">Selecione</option>
                      <option value="sangue">Sangue</option>
                      <option value="urina">Urina</option>
                      <option value="tecido">Tecido</option>
                      <option value="medula">Medula Óssea</option>
                      <option value="liquor">Líquor</option>
                      <option value="outro">Outro</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Histórico Clínico</label>
                    <textarea
                      name="clinicalHistory"
                      value={patientInfo.clinicalHistory}
                      onChange={handlePatientInfoChange}
                      rows={3}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                      placeholder="Descreva o histórico clínico relevante do paciente"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Sintomas Atuais</label>
                    <textarea
                      name="symptoms"
                      value={patientInfo.symptoms}
                      onChange={handlePatientInfoChange}
                      rows={2}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                      placeholder="Liste os sintomas atuais do paciente"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Exames Anteriores</label>
                    <textarea
                      name="previousExams"
                      value={patientInfo.previousExams}
                      onChange={handlePatientInfoChange}
                      rows={2}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                      placeholder="Liste exames anteriores relevantes"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Médico Solicitante</label>
                    <input
                      type="text"
                      name="requestingDoctor"
                      value={patientInfo.requestingDoctor}
                      onChange={handlePatientInfoChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Hospital/Clínica</label>
                    <input
                      type="text"
                      name="hospital"
                      value={patientInfo.hospital}
                      onChange={handlePatientInfoChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {previewUrl && !isAnalyzing && !results && (
              <button
                onClick={handleAnalyze}
                disabled={!isPatientInfoComplete()}
                className={`w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 flex items-center justify-center space-x-2 ${
                  !isPatientInfoComplete() ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <Microscope className="w-5 h-5" />
                <span>Analisar Células</span>
              </button>
            )}

            {isAnalyzing && (
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                <p className="mt-2 text-sm text-gray-600">Analisando células...</p>
              </div>
            )}
          </div>

          {/* Results Section */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Resultados da Análise</h2>
            
            {!results ? (
              <div className="text-center text-gray-500 py-12">
                <Microscope className="mx-auto h-12 w-12" />
                <p className="mt-2">Nenhuma análise realizada</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Patient Context */}
                <div className="bg-purple-50 rounded-lg p-4">
                  <h3 className="font-medium text-lg mb-2 flex items-center">
                    <User className="w-5 h-5 mr-2" />
                    Contexto do Paciente
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p><strong>Paciente:</strong> {patientInfo.name}</p>
                      <p><strong>Idade:</strong> {patientInfo.age} anos</p>
                      <p><strong>Gênero:</strong> {patientInfo.gender === 'M' ? 'Masculino' : patientInfo.gender === 'F' ? 'Feminino' : 'Outro'}</p>
                    </div>
                    <div>
                      <p><strong>Tipo de Exame:</strong> {patientInfo.examType}</p>
                      <p><strong>Tipo de Amostra:</strong> {patientInfo.sampleType}</p>
                      <p><strong>Data do Exame:</strong> {new Date(patientInfo.examDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>

                {/* Clinical Context */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-medium text-lg mb-2 flex items-center">
                    <Stethoscope className="w-5 h-5 mr-2" />
                    Contexto Clínico
                  </h3>
                  <div className="space-y-2 text-sm">
                    <p><strong>Histórico Clínico:</strong> {patientInfo.clinicalHistory || 'Não informado'}</p>
                    <p><strong>Sintomas Atuais:</strong> {patientInfo.symptoms || 'Não informado'}</p>
                    <p><strong>Exames Anteriores:</strong> {patientInfo.previousExams || 'Não informado'}</p>
                  </div>
                </div>

                {/* Diagnosis Summary */}
                <div className="border rounded-lg p-4 bg-gray-50">
                  <h3 className="font-medium text-lg mb-2 flex items-center">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    Diagnóstico
                  </h3>
                  <div className={`p-4 rounded-lg ${
                    results.abnormalityLevel === 'high' 
                      ? 'bg-red-50 text-red-700' 
                      : results.abnormalityLevel === 'medium'
                      ? 'bg-yellow-50 text-yellow-700'
                      : 'bg-green-50 text-green-700'
                  }`}>
                    <p className="text-lg font-medium">{results.diagnosis}</p>
                    <p className="mt-2 text-sm">
                      Nível de Anormalidade: {
                        results.abnormalityLevel === 'high' ? 'Alto' :
                        results.abnormalityLevel === 'medium' ? 'Médio' : 'Baixo'
                      }
                    </p>
                  </div>
                </div>

                {/* Statistics */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2">Análise Quantitativa</h4>
                    <ul className="space-y-2 text-sm">
                      <li>Total de Células: {results.statistics.totalCells}</li>
                      <li>Células Anormais: {results.statistics.abnormalCells}</li>
                      <li>Taxa de Anormalidade: {results.statistics.infestationPercentage.toFixed(1)}%</li>
                      <li>Tamanho Médio: {results.statistics.averageSize.toFixed(2)} µm²</li>
                    </ul>
                  </div>

                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2">Informações Técnicas</h4>
                    <ul className="space-y-2 text-sm">
                      <li>Tempo de Análise: {(results.executionTime / 1000).toFixed(2)} segundos</li>
                      <li>Resolução: {selectedFile?.width || 'N/A'} x {selectedFile?.height || 'N/A'}</li>
                      <li>Áreas Críticas: {results.statistics.criticalAreas}</li>
                    </ul>
                  </div>
                </div>

                {/* Detected Cells */}
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-2">Células Detectadas</h4>
                  <div className="max-h-60 overflow-y-auto">
                    {results.cells.map((cell) => (
                      <div key={cell.id} className="border-b py-2 last:border-b-0">
                        <div className="flex justify-between items-start">
                          <span className="font-medium">
                            Célula #{cell.id}
                          </span>
                          <span className="text-sm">
                            Localização: {cell.location}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          <p>Tamanho: {cell.size.toFixed(0)} µm² | Forma: {cell.shape.toFixed(2)}</p>
                          <p>Características: {cell.characteristics.join(', ')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Medical Recommendations */}
                <div className="border rounded-lg p-4 bg-yellow-50">
                  <h4 className="font-medium mb-2">Recomendações Médicas</h4>
                  <div className="text-sm space-y-2">
                    <p><strong>Interpretação:</strong> Os resultados devem ser interpretados em conjunto com o histórico clínico completo e outros exames relevantes.</p>
                    <p><strong>Próximos Passos:</strong></p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Agendar consulta com o médico solicitante para discussão dos resultados</li>
                      <li>Trazer exames anteriores para comparação</li>
                      <li>Considerar exames complementares conforme orientação médica</li>
                    </ul>
                  </div>
                </div>

                {/* Processed Image */}
                {results.processedImageUrl && (
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2">Imagem Processada</h4>
                    <img
                      src={results.processedImageUrl}
                      alt="Processed"
                      className="w-full h-auto rounded-lg"
                    />
                    <p className="mt-2 text-sm text-gray-600">
                      Legenda: 
                      <span className="ml-2 inline-flex items-center">
                        <span className="w-3 h-3 bg-red-500 rounded-full mr-1"></span>
                        Possível Malignidade
                      </span>
                      <span className="ml-2 inline-flex items-center">
                        <span className="w-3 h-3 bg-yellow-500 rounded-full mr-1"></span>
                        Alta Intensidade
                      </span>
                      <span className="ml-2 inline-flex items-center">
                        <span className="w-3 h-3 bg-green-500 rounded-full mr-1"></span>
                        Normal
                      </span>
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-8">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="text-center text-gray-600 text-sm">
            <p>© 2024 Like Look Solutions. Desenvolvido por Julio Campos Machado</p>
            <p className="mt-1">
              <a
                href="https://wa.me/5511970603441"
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-600 hover:text-purple-800"
              >
                Contato: +55 11 97060-3441
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}