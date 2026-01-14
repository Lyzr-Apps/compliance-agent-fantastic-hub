import { useState } from 'react'
import { callAIAgent, uploadFiles } from '@/utils/aiAgent'
import type { NormalizedAgentResponse } from '@/utils/aiAgent'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Upload, FileText, AlertCircle, CheckCircle, TrendingUp, TrendingDown,
  AlertTriangle, Search, Download, RefreshCw, Loader2, XCircle, FileCheck,
  Database, Filter, ArrowUpDown, DollarSign, PieChart
} from 'lucide-react'

// =============================================================================
// Agent IDs (from workflow.json)
// =============================================================================

const COMPLIANCE_COORDINATOR_AGENT_ID = '6967c339f038ff7259fe2ace'
const RULE_EXTRACTION_AGENT_ID = '6967c2d5f038ff7259fe2ac5'
const COMPLIANCE_CHECKER_AGENT_ID = '6967c2edf038ff7259fe2ac6'
const REMEDIATION_ANALYST_AGENT_ID = '6967c30af038ff7259fe2aca'

// =============================================================================
// TypeScript Interfaces (from actual test response data)
// =============================================================================

interface BreachDetail {
  breach_id: string
  severity: 'hard_breach' | 'soft_breach'
  description: string
  current_value: number
  threshold_value: number
  excess_amount: number
  remediation_priority: 'immediate' | 'high' | 'medium' | 'low'
  recommended_actions: string[]
}

interface ComplianceDashboard {
  overall_status: string
  compliance_score: number
  summary: {
    total_rules_extracted: number
    total_rules_checked: number
    total_breaches: number
    hard_breaches: number
    soft_breaches: number
    remediation_actions_recommended: number
  }
  extracted_rules_summary: {
    total_extracted: number
    ambiguous_rules_flagged: number
    confidence_score: number
  }
  breach_details: BreachDetail[]
  remediation_summary: {
    immediate_actions_required: number
    estimated_total_cost: number
    recommended_timeline: string
  }
}

interface CoordinatorResult {
  compliance_dashboard: ComplianceDashboard
  workflow_execution: {
    rule_extraction_completed: boolean
    compliance_check_completed: boolean
    remediation_analysis_completed: boolean
    errors: string[]
  }
}

interface ExtractedRule {
  rule_id?: string
  category?: string
  description?: string
  threshold?: number
  severity?: string
}

interface RuleExtractionResult {
  extracted_rules: ExtractedRule[]
  ambiguous_rules: any[]
  total_rules_extracted: number
  confidence_score: number
}

// =============================================================================
// Inline Components (defined outside Home to prevent re-creation)
// =============================================================================

function ComplianceScoreGauge({ score }: { score: number }) {
  const getColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getBgColor = (score: number) => {
    if (score >= 90) return 'bg-green-600'
    if (score >= 70) return 'bg-yellow-600'
    return 'bg-red-600'
  }

  return (
    <div className="flex flex-col items-center justify-center p-6">
      <div className="relative w-40 h-40">
        <svg className="transform -rotate-90 w-40 h-40">
          <circle
            cx="80"
            cy="80"
            r="70"
            stroke="currentColor"
            strokeWidth="12"
            fill="transparent"
            className="text-gray-200"
          />
          <circle
            cx="80"
            cy="80"
            r="70"
            stroke="currentColor"
            strokeWidth="12"
            fill="transparent"
            strokeDasharray={`${2 * Math.PI * 70}`}
            strokeDashoffset={`${2 * Math.PI * 70 * (1 - score / 100)}`}
            className={getBgColor(score)}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-4xl font-bold ${getColor(score)}`}>{score}</span>
          <span className="text-sm text-gray-500">Score</span>
        </div>
      </div>
    </div>
  )
}

function SeverityBadge({ severity }: { severity: string }) {
  if (severity === 'hard_breach') {
    return <Badge className="bg-red-600 text-white hover:bg-red-700">Hard Breach</Badge>
  }
  if (severity === 'soft_breach') {
    return <Badge className="bg-yellow-600 text-white hover:bg-yellow-700">Soft Breach</Badge>
  }
  return <Badge variant="outline">{severity}</Badge>
}

function PriorityBadge({ priority }: { priority: string }) {
  if (priority === 'immediate') {
    return <Badge className="bg-red-600 text-white hover:bg-red-700">Immediate</Badge>
  }
  if (priority === 'high') {
    return <Badge className="bg-orange-600 text-white hover:bg-orange-700">High</Badge>
  }
  if (priority === 'medium') {
    return <Badge className="bg-yellow-600 text-white hover:bg-yellow-700">Medium</Badge>
  }
  return <Badge variant="outline">Low</Badge>
}

function DashboardPage({ dashboard }: { dashboard: ComplianceDashboard | null }) {
  if (!dashboard) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-gray-400">
        <FileText className="w-16 h-16 mb-4" />
        <p className="text-lg">No compliance data available</p>
        <p className="text-sm">Upload a guideline document to run a compliance check</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-2 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Compliance Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{dashboard.compliance_score}%</div>
          </CardContent>
        </Card>

        <Card className="border-2 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Rules</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{dashboard.summary.total_rules_checked}</div>
          </CardContent>
        </Card>

        <Card className="border-2 border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Breaches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{dashboard.summary.total_breaches}</div>
            <p className="text-xs text-gray-500 mt-1">
              {dashboard.summary.hard_breaches} hard, {dashboard.summary.soft_breaches} soft
            </p>
          </CardContent>
        </Card>

        <Card className="border-2 border-yellow-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Actions Required</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">
              {dashboard.remediation_summary.immediate_actions_required}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Compliance Score Gauge */}
      <Card>
        <CardHeader>
          <CardTitle>Overall Compliance Status</CardTitle>
          <CardDescription>Current compliance health and score</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <ComplianceScoreGauge score={dashboard.compliance_score} />
            <div className="flex-1 ml-8 space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-gray-600">Status</span>
                  <Badge variant={dashboard.overall_status === 'breaches_detected' ? 'destructive' : 'default'}>
                    {dashboard.overall_status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-gray-600">Remediation Timeline</span>
                  <span className="text-sm font-medium">{dashboard.remediation_summary.recommended_timeline}</span>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-gray-600">Estimated Cost</span>
                  <span className="text-sm font-medium">${dashboard.remediation_summary.estimated_total_cost.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Breach Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle>Breach Summary</CardTitle>
          <CardDescription>All detected compliance violations</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Current</TableHead>
                <TableHead className="text-right">Threshold</TableHead>
                <TableHead className="text-right">Excess</TableHead>
                <TableHead>Priority</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dashboard.breach_details.map((breach) => (
                <TableRow key={breach.breach_id}>
                  <TableCell className="font-mono text-sm">{breach.breach_id}</TableCell>
                  <TableCell>
                    <SeverityBadge severity={breach.severity} />
                  </TableCell>
                  <TableCell className="max-w-md">
                    <p className="text-sm line-clamp-2">{breach.description}</p>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {typeof breach.current_value === 'number' && breach.current_value > 1000
                      ? `$${breach.current_value.toLocaleString()}`
                      : breach.current_value.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {typeof breach.threshold_value === 'number' && breach.threshold_value > 1000
                      ? `$${breach.threshold_value.toLocaleString()}`
                      : breach.threshold_value.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm text-red-600">
                    {typeof breach.excess_amount === 'number' && Math.abs(breach.excess_amount) > 1000
                      ? `$${Math.abs(breach.excess_amount).toLocaleString()}`
                      : Math.abs(breach.excess_amount).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <PriorityBadge priority={breach.remediation_priority} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Remediation Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Recommended Actions</CardTitle>
          <CardDescription>Remediation steps for each breach</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dashboard.breach_details.map((breach) => (
              <div key={breach.breach_id} className="border-l-4 border-blue-500 pl-4 py-2">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="font-semibold text-sm">{breach.breach_id}</span>
                    <span className="text-xs text-gray-500 ml-2">{breach.description.substring(0, 50)}...</span>
                  </div>
                  <PriorityBadge priority={breach.remediation_priority} />
                </div>
                <ul className="space-y-1">
                  {breach.recommended_actions.map((action, idx) => (
                    <li key={idx} className="text-sm text-gray-700 flex items-start">
                      <CheckCircle className="w-4 h-4 mr-2 mt-0.5 text-green-600 flex-shrink-0" />
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Ambiguous Rules Alert */}
      {dashboard.extracted_rules_summary.ambiguous_rules_flagged > 0 && (
        <Card className="border-2 border-yellow-300 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center text-yellow-800">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Ambiguous Rules Detected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-yellow-800">
              {dashboard.extracted_rules_summary.ambiguous_rules_flagged} rule(s) contain unclear or ambiguous language.
              Review these rules in the Rules Library for clarification.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function AgentInterfacePage() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [response, setResponse] = useState<NormalizedAgentResponse | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setError(null)
    }
  }

  const handleRunComplianceCheck = async () => {
    if (!file) {
      setError('Please upload a PDF file first')
      return
    }

    setLoading(true)
    setError(null)
    setUploadProgress(0)

    try {
      // Upload file
      setUploadProgress(30)
      const uploadResult = await uploadFiles(file)

      if (!uploadResult.success) {
        setError(uploadResult.error || 'File upload failed')
        setLoading(false)
        return
      }

      setUploadProgress(50)

      // Call Compliance Coordinator Agent with uploaded file
      const result = await callAIAgent(
        `Run a complete compliance check for the uploaded investment guideline document. Extract rules, validate portfolio holdings, and provide remediation recommendations.`,
        COMPLIANCE_COORDINATOR_AGENT_ID,
        { assets: uploadResult.asset_ids }
      )

      setUploadProgress(100)

      if (result.success) {
        setResponse(result.response)
      } else {
        setError(result.error || 'Compliance check failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload Investment Guideline</CardTitle>
          <CardDescription>Upload a PDF document containing investment guidelines and compliance rules</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File Upload Dropzone */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
              disabled={loading}
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              {file ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">{file.name}</p>
                  <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-medium text-gray-700">Click to upload or drag and drop</p>
                  <p className="text-xs text-gray-500">PDF files only</p>
                </div>
              )}
            </label>
          </div>

          {/* Run Button */}
          <Button
            onClick={handleRunComplianceCheck}
            disabled={!file || loading}
            className="w-full bg-blue-600 hover:bg-blue-700"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <FileCheck className="w-4 h-4 mr-2" />
                Run Compliance Check
              </>
            )}
          </Button>

          {/* Progress */}
          {loading && (
            <div className="space-y-2">
              <Progress value={uploadProgress} className="w-full" />
              <p className="text-xs text-center text-gray-500">
                {uploadProgress < 50 ? 'Uploading document...' : 'Running compliance check...'}
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start p-4 bg-red-50 border border-red-200 rounded-lg">
              <XCircle className="w-5 h-5 text-red-600 mr-2 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">Error</p>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Display */}
      {response && response.result && (
        <Card>
          <CardHeader>
            <CardTitle>Compliance Check Results</CardTitle>
            <CardDescription>
              Status: <Badge variant={response.status === 'success' ? 'default' : 'destructive'}>{response.status}</Badge>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {response.result.compliance_dashboard ? (
              <div className="space-y-4">
                {/* Summary */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">
                      {response.result.compliance_dashboard.compliance_score}%
                    </p>
                    <p className="text-xs text-gray-600">Compliance Score</p>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <p className="text-2xl font-bold text-red-600">
                      {response.result.compliance_dashboard.summary.total_breaches}
                    </p>
                    <p className="text-xs text-gray-600">Total Breaches</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">
                      {response.result.compliance_dashboard.summary.total_rules_extracted}
                    </p>
                    <p className="text-xs text-gray-600">Rules Extracted</p>
                  </div>
                </div>

                {/* Breach Details Table */}
                {response.result.compliance_dashboard.breach_details && response.result.compliance_dashboard.breach_details.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Breach Details</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Severity</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Priority</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {response.result.compliance_dashboard.breach_details.map((breach: BreachDetail) => (
                          <TableRow key={breach.breach_id}>
                            <TableCell className="font-mono text-sm">{breach.breach_id}</TableCell>
                            <TableCell><SeverityBadge severity={breach.severity} /></TableCell>
                            <TableCell className="max-w-md text-sm">{breach.description}</TableCell>
                            <TableCell><PriorityBadge priority={breach.remediation_priority} /></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Remediation Summary */}
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h3 className="font-semibold mb-2 text-yellow-800">Remediation Summary</h3>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    <li>Immediate actions required: {response.result.compliance_dashboard.remediation_summary.immediate_actions_required}</li>
                    <li>Estimated cost: ${response.result.compliance_dashboard.remediation_summary.estimated_total_cost.toLocaleString()}</li>
                    <li>Timeline: {response.result.compliance_dashboard.remediation_summary.recommended_timeline}</li>
                  </ul>
                </div>
              </div>
            ) : (
              <pre className="bg-gray-50 p-4 rounded text-xs overflow-auto max-h-96">
                {JSON.stringify(response.result, null, 2)}
              </pre>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function VersionComparisonPage() {
  const [version1, setVersion1] = useState('')
  const [version2, setVersion2] = useState('')
  const [loading, setLoading] = useState(false)
  const [comparisonResult, setComparisonResult] = useState<any>(null)

  const versions = [
    'Guideline v1.0 (Jan 2024)',
    'Guideline v1.1 (Mar 2024)',
    'Guideline v2.0 (Jun 2024)',
    'Guideline v2.1 (Sep 2024)',
  ]

  const handleCompare = async () => {
    if (!version1 || !version2) return

    setLoading(true)
    // Simulate comparison
    setTimeout(() => {
      setComparisonResult({
        added: ['ESG exclusion list updated with 5 new securities', 'Maximum cash limit reduced from 15% to 10%'],
        removed: ['Legacy benchmark reference removed'],
        modified: ['Tracking error limit increased from 100bps to 150bps', 'Performance measurement period clarified'],
      })
      setLoading(false)
    }, 1500)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Compare Guideline Versions</CardTitle>
          <CardDescription>Select two versions to compare rule changes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Version A</label>
              <select
                className="w-full p-2 border rounded-md"
                value={version1}
                onChange={(e) => setVersion1(e.target.value)}
              >
                <option value="">Select version...</option>
                {versions.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Version B</label>
              <select
                className="w-full p-2 border rounded-md"
                value={version2}
                onChange={(e) => setVersion2(e.target.value)}
              >
                <option value="">Select version...</option>
                {versions.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
          </div>

          <Button
            onClick={handleCompare}
            disabled={!version1 || !version2 || loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Comparing...
              </>
            ) : (
              'Compare Versions'
            )}
          </Button>
        </CardContent>
      </Card>

      {comparisonResult && (
        <Card>
          <CardHeader>
            <CardTitle>Comparison Results</CardTitle>
            <CardDescription>{version1} vs {version2}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Added Rules */}
            {comparisonResult.added.length > 0 && (
              <div>
                <h3 className="font-semibold text-green-700 mb-2 flex items-center">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Added Rules ({comparisonResult.added.length})
                </h3>
                <div className="space-y-2">
                  {comparisonResult.added.map((rule: string, idx: number) => (
                    <div key={idx} className="p-3 bg-green-50 border-l-4 border-green-500 rounded">
                      <p className="text-sm text-green-800">{rule}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Removed Rules */}
            {comparisonResult.removed.length > 0 && (
              <div>
                <h3 className="font-semibold text-red-700 mb-2 flex items-center">
                  <TrendingDown className="w-4 h-4 mr-2" />
                  Removed Rules ({comparisonResult.removed.length})
                </h3>
                <div className="space-y-2">
                  {comparisonResult.removed.map((rule: string, idx: number) => (
                    <div key={idx} className="p-3 bg-red-50 border-l-4 border-red-500 rounded">
                      <p className="text-sm text-red-800">{rule}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Modified Rules */}
            {comparisonResult.modified.length > 0 && (
              <div>
                <h3 className="font-semibold text-blue-700 mb-2 flex items-center">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Modified Rules ({comparisonResult.modified.length})
                </h3>
                <div className="space-y-2">
                  {comparisonResult.modified.map((rule: string, idx: number) => (
                    <div key={idx} className="p-3 bg-blue-50 border-l-4 border-blue-500 rounded">
                      <p className="text-sm text-blue-800">{rule}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Portfolio Database Types
interface PortfolioHolding {
  id: string
  portfolio_id: string
  portfolio_name: string
  security_name: string
  ticker: string
  isin: string
  asset_class: 'Equity' | 'Fixed Income' | 'Alternatives' | 'Cash'
  position_size: number
  weight: number
  rating?: string
  country: string
  region: string
  sector: string
}

interface PortfolioSummary {
  portfolio_id: string
  portfolio_name: string
  total_aum: number
  asset_allocation: {
    Equity: number
    'Fixed Income': number
    Alternatives: number
    Cash: number
  }
}

function PortfolioDatabasePage() {
  const [selectedPortfolio, setSelectedPortfolio] = useState('ABC')
  const [searchTerm, setSearchTerm] = useState('')
  const [assetClassFilter, setAssetClassFilter] = useState<string>('All')
  const [sortColumn, setSortColumn] = useState<string>('weight')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  // Dummy portfolio data - realistic holdings
  const portfolioData: Record<string, PortfolioHolding[]> = {
    ABC: [
      // Equities (45% - BREACHING 40% LIMIT!)
      { id: '1', portfolio_id: 'ABC', portfolio_name: 'Portfolio ABC', security_name: 'Apple Inc', ticker: 'AAPL', isin: 'US0378331005', asset_class: 'Equity', position_size: 850000, weight: 8.5, country: 'United States', region: 'North America', sector: 'Technology' },
      { id: '2', portfolio_id: 'ABC', portfolio_name: 'Portfolio ABC', security_name: 'Microsoft Corp', ticker: 'MSFT', isin: 'US5949181045', asset_class: 'Equity', position_size: 750000, weight: 7.5, country: 'United States', region: 'North America', sector: 'Technology' },
      { id: '3', portfolio_id: 'ABC', portfolio_name: 'Portfolio ABC', security_name: 'Amazon.com Inc', ticker: 'AMZN', isin: 'US0231351067', asset_class: 'Equity', position_size: 650000, weight: 6.5, country: 'United States', region: 'North America', sector: 'Consumer Discretionary' },
      { id: '4', portfolio_id: 'ABC', portfolio_name: 'Portfolio ABC', security_name: 'Alphabet Inc Class A', ticker: 'GOOGL', isin: 'US02079K3059', asset_class: 'Equity', position_size: 600000, weight: 6.0, country: 'United States', region: 'North America', sector: 'Technology' },
      { id: '5', portfolio_id: 'ABC', portfolio_name: 'Portfolio ABC', security_name: 'NVIDIA Corp', ticker: 'NVDA', isin: 'US67066G1040', asset_class: 'Equity', position_size: 550000, weight: 5.5, country: 'United States', region: 'North America', sector: 'Technology' },
      { id: '6', portfolio_id: 'ABC', portfolio_name: 'Portfolio ABC', security_name: 'Tesla Inc', ticker: 'TSLA', isin: 'US88160R1014', asset_class: 'Equity', position_size: 450000, weight: 4.5, country: 'United States', region: 'North America', sector: 'Consumer Discretionary' },
      { id: '7', portfolio_id: 'ABC', portfolio_name: 'Portfolio ABC', security_name: 'Johnson & Johnson', ticker: 'JNJ', isin: 'US4781601046', asset_class: 'Equity', position_size: 400000, weight: 4.0, country: 'United States', region: 'North America', sector: 'Healthcare' },
      { id: '8', portfolio_id: 'ABC', portfolio_name: 'Portfolio ABC', security_name: 'JPMorgan Chase & Co', ticker: 'JPM', isin: 'US46625H1005', asset_class: 'Equity', position_size: 250000, weight: 2.5, country: 'United States', region: 'North America', sector: 'Financials' },

      // Fixed Income (35%)
      { id: '9', portfolio_id: 'ABC', portfolio_name: 'Portfolio ABC', security_name: 'US Treasury 10Y', ticker: 'T 2.5 05/15/2034', isin: 'US912810TW65', asset_class: 'Fixed Income', position_size: 900000, weight: 9.0, rating: 'AAA', country: 'United States', region: 'North America', sector: 'Government' },
      { id: '10', portfolio_id: 'ABC', portfolio_name: 'Portfolio ABC', security_name: 'US Treasury 5Y', ticker: 'T 2.0 04/30/2029', isin: 'US912810TE12', asset_class: 'Fixed Income', position_size: 800000, weight: 8.0, rating: 'AAA', country: 'United States', region: 'North America', sector: 'Government' },
      { id: '11', portfolio_id: 'ABC', portfolio_name: 'Portfolio ABC', security_name: 'ABC Corp 3.5% 2029', ticker: 'ABC35-29', isin: 'US0001231234', asset_class: 'Fixed Income', position_size: 700000, weight: 7.0, rating: 'BBB', country: 'United States', region: 'North America', sector: 'Industrials' },
      { id: '12', portfolio_id: 'ABC', portfolio_name: 'Portfolio ABC', security_name: 'Goldman Sachs Group 2.625% 2031', ticker: 'GS2625-31', isin: 'US38141GXX98', asset_class: 'Fixed Income', position_size: 600000, weight: 6.0, rating: 'A-', country: 'United States', region: 'North America', sector: 'Financials' },
      { id: '13', portfolio_id: 'ABC', portfolio_name: 'Portfolio ABC', security_name: 'Morgan Stanley 4.0% 2030', ticker: 'MS4-30', isin: 'US6174468616', asset_class: 'Fixed Income', position_size: 500000, weight: 5.0, rating: 'A', country: 'United States', region: 'North America', sector: 'Financials' },

      // Alternatives (8%)
      { id: '14', portfolio_id: 'ABC', portfolio_name: 'Portfolio ABC', security_name: 'Blackstone Real Estate Fund', ticker: 'BREP', isin: 'US09260D1072', asset_class: 'Alternatives', position_size: 400000, weight: 4.0, country: 'United States', region: 'North America', sector: 'Real Estate' },
      { id: '15', portfolio_id: 'ABC', portfolio_name: 'Portfolio ABC', security_name: 'KKR Infrastructure Fund', ticker: 'KKRI', isin: 'US48251W1045', asset_class: 'Alternatives', position_size: 400000, weight: 4.0, country: 'United States', region: 'North America', sector: 'Infrastructure' },

      // Cash (12% - BREACHING 10% LIMIT!)
      { id: '16', portfolio_id: 'ABC', portfolio_name: 'Portfolio ABC', security_name: 'Cash & Equivalents', ticker: 'CASH', isin: 'CASH-USD', asset_class: 'Cash', position_size: 1230000, weight: 12.3, country: 'United States', region: 'North America', sector: 'Cash' },
    ],
    XYZ: [
      // Equities (35%)
      { id: '17', portfolio_id: 'XYZ', portfolio_name: 'Portfolio XYZ', security_name: 'Meta Platforms Inc', ticker: 'META', isin: 'US30303M1027', asset_class: 'Equity', position_size: 600000, weight: 7.5, country: 'United States', region: 'North America', sector: 'Technology' },
      { id: '18', portfolio_id: 'XYZ', portfolio_name: 'Portfolio XYZ', security_name: 'Berkshire Hathaway', ticker: 'BRK.B', isin: 'US0846707026', asset_class: 'Equity', position_size: 550000, weight: 6.9, country: 'United States', region: 'North America', sector: 'Financials' },
      { id: '19', portfolio_id: 'XYZ', portfolio_name: 'Portfolio XYZ', security_name: 'Visa Inc', ticker: 'V', isin: 'US92826C8394', asset_class: 'Equity', position_size: 500000, weight: 6.3, country: 'United States', region: 'North America', sector: 'Financials' },
      { id: '20', portfolio_id: 'XYZ', portfolio_name: 'Portfolio XYZ', security_name: 'Procter & Gamble', ticker: 'PG', isin: 'US7427181091', asset_class: 'Equity', position_size: 450000, weight: 5.6, country: 'United States', region: 'North America', sector: 'Consumer Staples' },
      { id: '21', portfolio_id: 'XYZ', portfolio_name: 'Portfolio XYZ', security_name: 'Coca-Cola Company', ticker: 'KO', isin: 'US1912161007', asset_class: 'Equity', position_size: 400000, weight: 5.0, country: 'United States', region: 'North America', sector: 'Consumer Staples' },
      { id: '22', portfolio_id: 'XYZ', portfolio_name: 'Portfolio XYZ', security_name: 'Pfizer Inc', ticker: 'PFE', isin: 'US7170811035', asset_class: 'Equity', position_size: 300000, weight: 3.8, country: 'United States', region: 'North America', sector: 'Healthcare' },

      // Fixed Income (50%)
      { id: '23', portfolio_id: 'XYZ', portfolio_name: 'Portfolio XYZ', security_name: 'US Treasury 30Y', ticker: 'T 3.0 08/15/2054', isin: 'US912810TZ98', asset_class: 'Fixed Income', position_size: 1200000, weight: 15.0, rating: 'AAA', country: 'United States', region: 'North America', sector: 'Government' },
      { id: '24', portfolio_id: 'XYZ', portfolio_name: 'Portfolio XYZ', security_name: 'US Treasury 10Y', ticker: 'T 2.75 02/15/2034', isin: 'US912810TA24', asset_class: 'Fixed Income', position_size: 1000000, weight: 12.5, rating: 'AAA', country: 'United States', region: 'North America', sector: 'Government' },
      { id: '25', portfolio_id: 'XYZ', portfolio_name: 'Portfolio XYZ', security_name: 'Apple Inc 3.0% 2032', ticker: 'AAPL3-32', isin: 'US037833DK65', asset_class: 'Fixed Income', position_size: 800000, weight: 10.0, rating: 'AA+', country: 'United States', region: 'North America', sector: 'Technology' },
      { id: '26', portfolio_id: 'XYZ', portfolio_name: 'Portfolio XYZ', security_name: 'Microsoft Corp 2.4% 2031', ticker: 'MSFT24-31', isin: 'US594918BY90', asset_class: 'Fixed Income', position_size: 600000, weight: 7.5, rating: 'AAA', country: 'United States', region: 'North America', sector: 'Technology' },
      { id: '27', portfolio_id: 'XYZ', portfolio_name: 'Portfolio XYZ', security_name: 'JPMorgan 3.5% 2030', ticker: 'JPM35-30', isin: 'US46647PCJ46', asset_class: 'Fixed Income', position_size: 400000, weight: 5.0, rating: 'A', country: 'United States', region: 'North America', sector: 'Financials' },

      // Alternatives (10%)
      { id: '28', portfolio_id: 'XYZ', portfolio_name: 'Portfolio XYZ', security_name: 'Carlyle Global Infrastructure', ticker: 'CGIF', isin: 'US14309L1089', asset_class: 'Alternatives', position_size: 500000, weight: 6.3, country: 'United States', region: 'North America', sector: 'Infrastructure' },
      { id: '29', portfolio_id: 'XYZ', portfolio_name: 'Portfolio XYZ', security_name: 'Apollo Credit Fund', ticker: 'ACF', isin: 'US03769M1080', asset_class: 'Alternatives', position_size: 300000, weight: 3.8, country: 'United States', region: 'North America', sector: 'Credit' },

      // Cash (5%)
      { id: '30', portfolio_id: 'XYZ', portfolio_name: 'Portfolio XYZ', security_name: 'Cash & Equivalents', ticker: 'CASH', isin: 'CASH-USD', asset_class: 'Cash', position_size: 400000, weight: 5.0, country: 'United States', region: 'North America', sector: 'Cash' },
    ],
    DEF: [
      // Conservative portfolio - mostly bonds
      { id: '31', portfolio_id: 'DEF', portfolio_name: 'Portfolio DEF', security_name: 'US Treasury 20Y', ticker: 'T 2.875 05/15/2043', isin: 'US912810RB26', asset_class: 'Fixed Income', position_size: 2500000, weight: 25.0, rating: 'AAA', country: 'United States', region: 'North America', sector: 'Government' },
      { id: '32', portfolio_id: 'DEF', portfolio_name: 'Portfolio DEF', security_name: 'US Treasury 10Y', ticker: 'T 2.5 02/28/2034', isin: 'US912810RE60', asset_class: 'Fixed Income', position_size: 2000000, weight: 20.0, rating: 'AAA', country: 'United States', region: 'North America', sector: 'Government' },
      { id: '33', portfolio_id: 'DEF', portfolio_name: 'Portfolio DEF', security_name: 'US Treasury 5Y', ticker: 'T 2.0 11/30/2028', isin: 'US912810RC97', asset_class: 'Fixed Income', position_size: 1500000, weight: 15.0, rating: 'AAA', country: 'United States', region: 'North America', sector: 'Government' },
      { id: '34', portfolio_id: 'DEF', portfolio_name: 'Portfolio DEF', security_name: 'Verizon 4.125% 2030', ticker: 'VZ4125-30', isin: 'US92343VGE75', asset_class: 'Fixed Income', position_size: 1000000, weight: 10.0, rating: 'BBB+', country: 'United States', region: 'North America', sector: 'Telecommunications' },
      { id: '35', portfolio_id: 'DEF', portfolio_name: 'Portfolio DEF', security_name: 'AT&T 3.65% 2029', ticker: 'T365-29', isin: 'US00206RCL60', asset_class: 'Fixed Income', position_size: 800000, weight: 8.0, rating: 'BBB', country: 'United States', region: 'North America', sector: 'Telecommunications' },
      { id: '36', portfolio_id: 'DEF', portfolio_name: 'Portfolio DEF', security_name: 'Walmart 2.95% 2032', ticker: 'WMT295-32', isin: 'US931142EB49', asset_class: 'Fixed Income', position_size: 700000, weight: 7.0, rating: 'AA', country: 'United States', region: 'North America', sector: 'Consumer Staples' },

      // Equities (15%)
      { id: '37', portfolio_id: 'DEF', portfolio_name: 'Portfolio DEF', security_name: 'Johnson & Johnson', ticker: 'JNJ', isin: 'US4781601046', asset_class: 'Equity', position_size: 500000, weight: 5.0, country: 'United States', region: 'North America', sector: 'Healthcare' },
      { id: '38', portfolio_id: 'DEF', portfolio_name: 'Portfolio DEF', security_name: 'Procter & Gamble', ticker: 'PG', isin: 'US7427181091', asset_class: 'Equity', position_size: 500000, weight: 5.0, country: 'United States', region: 'North America', sector: 'Consumer Staples' },
      { id: '39', portfolio_id: 'DEF', portfolio_name: 'Portfolio DEF', security_name: 'Coca-Cola Company', ticker: 'KO', isin: 'US1912161007', asset_class: 'Equity', position_size: 500000, weight: 5.0, country: 'United States', region: 'North America', sector: 'Consumer Staples' },

      // Cash (5%)
      { id: '40', portfolio_id: 'DEF', portfolio_name: 'Portfolio DEF', security_name: 'Cash & Equivalents', ticker: 'CASH', isin: 'CASH-USD', asset_class: 'Cash', position_size: 500000, weight: 5.0, country: 'United States', region: 'North America', sector: 'Cash' },
    ],
  }

  // Calculate portfolio summary
  const calculatePortfolioSummary = (portfolioId: string): PortfolioSummary => {
    const holdings = portfolioData[portfolioId] || []
    const total_aum = holdings.reduce((sum, h) => sum + h.position_size, 0)

    const allocation = {
      Equity: 0,
      'Fixed Income': 0,
      Alternatives: 0,
      Cash: 0,
    }

    holdings.forEach(h => {
      allocation[h.asset_class] += h.weight
    })

    return {
      portfolio_id: portfolioId,
      portfolio_name: `Portfolio ${portfolioId}`,
      total_aum,
      asset_allocation: allocation,
    }
  }

  const summary = calculatePortfolioSummary(selectedPortfolio)
  const holdings = portfolioData[selectedPortfolio] || []

  // Filter and sort holdings
  const filteredHoldings = holdings
    .filter(h => {
      const matchesSearch =
        h.security_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        h.ticker.toLowerCase().includes(searchTerm.toLowerCase()) ||
        h.sector.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesFilter = assetClassFilter === 'All' || h.asset_class === assetClassFilter

      return matchesSearch && matchesFilter
    })
    .sort((a, b) => {
      const aVal = a[sortColumn as keyof PortfolioHolding]
      const bVal = b[sortColumn as keyof PortfolioHolding]

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
      }

      return 0
    })

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('desc')
    }
  }

  const handleExport = () => {
    const csvContent = [
      ['Portfolio', 'Security Name', 'Ticker', 'ISIN', 'Asset Class', 'Position Size', 'Weight %', 'Rating', 'Country', 'Region', 'Sector'].join(','),
      ...filteredHoldings.map(h =>
        [h.portfolio_name, h.security_name, h.ticker, h.isin, h.asset_class, h.position_size, h.weight, h.rating || '', h.country, h.region, h.sector].join(',')
      )
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `portfolio_${selectedPortfolio}_holdings.csv`
    a.click()
  }

  const getAssetClassColor = (assetClass: string) => {
    switch (assetClass) {
      case 'Equity':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'Fixed Income':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'Alternatives':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'Cash':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <div className="space-y-6">
      {/* Portfolio Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="border-2 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total AUM</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              ${(summary.total_aum / 1000000).toFixed(2)}M
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-blue-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Equity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">
              {summary.asset_allocation.Equity.toFixed(1)}%
            </div>
            <Progress
              value={summary.asset_allocation.Equity}
              className="mt-2 h-2"
            />
          </CardContent>
        </Card>

        <Card className="border-2 border-green-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Fixed Income</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">
              {summary.asset_allocation['Fixed Income'].toFixed(1)}%
            </div>
            <Progress
              value={summary.asset_allocation['Fixed Income']}
              className="mt-2 h-2"
            />
          </CardContent>
        </Card>

        <Card className="border-2 border-purple-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Alternatives</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700">
              {summary.asset_allocation.Alternatives.toFixed(1)}%
            </div>
            <Progress
              value={summary.asset_allocation.Alternatives}
              className="mt-2 h-2"
            />
          </CardContent>
        </Card>

        <Card className="border-2 border-gray-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Cash</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-700">
              {summary.asset_allocation.Cash.toFixed(1)}%
            </div>
            <Progress
              value={summary.asset_allocation.Cash}
              className="mt-2 h-2"
            />
          </CardContent>
        </Card>
      </div>

      {/* Asset Allocation Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="w-5 h-5" />
            Asset Allocation Breakdown
          </CardTitle>
          <CardDescription>{summary.portfolio_name}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(summary.asset_allocation).map(([assetClass, percentage]) => (
              <div key={assetClass} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{assetClass}</span>
                  <span className="text-sm font-bold">{percentage.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      assetClass === 'Equity' ? 'bg-blue-600' :
                      assetClass === 'Fixed Income' ? 'bg-green-600' :
                      assetClass === 'Alternatives' ? 'bg-purple-600' :
                      'bg-gray-600'
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Compliance alerts */}
          {summary.asset_allocation.Equity > 40 && (
            <div className="mt-4 p-3 bg-red-50 border-l-4 border-red-500 rounded">
              <div className="flex items-start">
                <AlertTriangle className="w-5 h-5 text-red-600 mr-2 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-800">Equity Allocation Breach</p>
                  <p className="text-xs text-red-700">
                    Current equity allocation ({summary.asset_allocation.Equity.toFixed(1)}%) exceeds the 40% limit
                  </p>
                </div>
              </div>
            </div>
          )}

          {summary.asset_allocation.Cash > 10 && (
            <div className="mt-4 p-3 bg-yellow-50 border-l-4 border-yellow-500 rounded">
              <div className="flex items-start">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-yellow-800">Cash Allocation Warning</p>
                  <p className="text-xs text-yellow-700">
                    Current cash allocation ({summary.asset_allocation.Cash.toFixed(1)}%) exceeds the 10% limit
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Holdings Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Portfolio Holdings
          </CardTitle>
          <CardDescription>Detailed view of all portfolio positions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Controls */}
          <div className="flex flex-wrap gap-4">
            {/* Portfolio Selector */}
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">Portfolio</label>
              <select
                className="w-full p-2 border rounded-md bg-white"
                value={selectedPortfolio}
                onChange={(e) => setSelectedPortfolio(e.target.value)}
              >
                <option value="ABC">Portfolio ABC</option>
                <option value="XYZ">Portfolio XYZ</option>
                <option value="DEF">Portfolio DEF</option>
              </select>
            </div>

            {/* Search */}
            <div className="flex-1 min-w-[250px]">
              <label className="text-sm font-medium mb-2 block">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by name, ticker, sector..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Asset Class Filter */}
            <div className="min-w-[180px]">
              <label className="text-sm font-medium mb-2 block">Asset Class</label>
              <select
                className="w-full p-2 border rounded-md bg-white"
                value={assetClassFilter}
                onChange={(e) => setAssetClassFilter(e.target.value)}
              >
                <option value="All">All Classes</option>
                <option value="Equity">Equity</option>
                <option value="Fixed Income">Fixed Income</option>
                <option value="Alternatives">Alternatives</option>
                <option value="Cash">Cash</option>
              </select>
            </div>

            {/* Export Button */}
            <div className="flex items-end">
              <Button onClick={handleExport} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Results Count */}
          <div className="text-sm text-gray-500">
            Showing {filteredHoldings.length} of {holdings.length} holdings
          </div>

          {/* Table */}
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Security Name</TableHead>
                  <TableHead>Ticker</TableHead>
                  <TableHead>ISIN</TableHead>
                  <TableHead>Asset Class</TableHead>
                  <TableHead
                    className="text-right cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort('position_size')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Position Size
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="text-right cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort('weight')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Weight %
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Sector</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHoldings.map((holding) => (
                  <TableRow key={holding.id}>
                    <TableCell className="font-medium">{holding.security_name}</TableCell>
                    <TableCell className="font-mono text-sm">{holding.ticker}</TableCell>
                    <TableCell className="font-mono text-xs text-gray-500">{holding.isin}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getAssetClassColor(holding.asset_class)}>
                        {holding.asset_class}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      ${holding.position_size.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="font-semibold">{holding.weight.toFixed(1)}%</span>
                        <div className="w-12 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${Math.min(holding.weight * 10, 100)}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {holding.rating ? (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {holding.rating}
                        </Badge>
                      ) : (
                        <span className="text-xs text-gray-400">N/A</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{holding.country}</TableCell>
                    <TableCell className="text-sm">{holding.sector}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}

function RulesLibraryPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [rules, setRules] = useState<RuleExtractionResult | null>(null)

  // Dummy rules data for demonstration
  const dummyRules: ExtractedRule[] = [
    {
      rule_id: 'R001',
      category: 'Performance',
      description: 'Total return must not underperform the Custom Account Benchmark by more than 60 bps gross of fees per annum over full market cycle',
      threshold: 0.6,
      severity: 'soft_breach'
    },
    {
      rule_id: 'R002',
      category: 'Risk',
      description: 'Long-term ex-ante tracking error must not exceed 150 bps p.a.',
      threshold: 1.5,
      severity: 'soft_breach'
    },
    {
      rule_id: 'R003',
      category: 'ESG',
      description: 'No positions allowed in securities on the ESG exclusion list',
      threshold: 0,
      severity: 'hard_breach'
    },
    {
      rule_id: 'R004',
      category: 'Issuer',
      description: 'No direct holdings in Goldman Sachs affiliate securities',
      threshold: 0,
      severity: 'hard_breach'
    },
    {
      rule_id: 'R005',
      category: 'Cash',
      description: 'Settled date cash must not exceed 10% of portfolio value',
      threshold: 0.1,
      severity: 'soft_breach'
    },
  ]

  const filteredRules = dummyRules.filter(rule =>
    rule.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rule.category?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleExport = () => {
    const csvContent = [
      ['Rule ID', 'Category', 'Description', 'Threshold', 'Severity'].join(','),
      ...filteredRules.map(rule =>
        [rule.rule_id, rule.category, `"${rule.description}"`, rule.threshold, rule.severity].join(',')
      )
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'rules_library.csv'
    a.click()
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Rules Library</CardTitle>
          <CardDescription>All extracted compliance rules from investment guidelines</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Export */}
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search rules by description or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={handleExport} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>

          {/* Rules Count */}
          <div className="text-sm text-gray-500">
            Showing {filteredRules.length} of {dummyRules.length} rules
          </div>

          {/* Rules Table */}
          <ScrollArea className="h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rule ID</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Threshold</TableHead>
                  <TableHead>Severity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRules.map((rule) => (
                  <TableRow key={rule.rule_id}>
                    <TableCell className="font-mono text-sm">{rule.rule_id}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{rule.category}</Badge>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <p className="text-sm">{rule.description}</p>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {rule.threshold !== undefined && rule.threshold !== null
                        ? typeof rule.threshold === 'number' && rule.threshold < 1
                          ? `${(rule.threshold * 100).toFixed(1)}%`
                          : rule.threshold
                        : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <SeverityBadge severity={rule.severity || 'unknown'} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}

// =============================================================================
// Main Home Component
// =============================================================================

export default function Home() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [dashboardData, setDashboardData] = useState<ComplianceDashboard | null>(null)

  // Load sample dashboard data
  useState(() => {
    // Using actual test response data
    const sampleDashboard: ComplianceDashboard = {
      overall_status: 'breaches_detected',
      compliance_score: 85,
      summary: {
        total_rules_extracted: 13,
        total_rules_checked: 13,
        total_breaches: 5,
        hard_breaches: 2,
        soft_breaches: 3,
        remediation_actions_recommended: 5
      },
      extracted_rules_summary: {
        total_extracted: 13,
        ambiguous_rules_flagged: 3,
        confidence_score: 0.8
      },
      breach_details: [
        {
          breach_id: 'BR001',
          severity: 'soft_breach',
          description: 'Total return underperformed the Custom Account Benchmark by 40 bps gross of fees per annum over the last full market cycle.',
          current_value: -0.4,
          threshold_value: 0.6,
          excess_amount: -1.0,
          remediation_priority: 'medium',
          recommended_actions: ['Review and rebalance allocation relative to benchmark. Enhance research process and active positions.']
        },
        {
          breach_id: 'BR002',
          severity: 'soft_breach',
          description: 'Long-term ex-ante tracking error exceeded 150 bps p.a. (actual: 170 bps).',
          current_value: 1.7,
          threshold_value: 1.5,
          excess_amount: 0.2,
          remediation_priority: 'high',
          recommended_actions: ['Reduce benchmark-divergent exposures. Increase core holdings alignment.']
        },
        {
          breach_id: 'BR003',
          severity: 'hard_breach',
          description: 'Position held in security present on the ESG exclusion list (ABC Corp 3.5% 2029, $700,000).',
          current_value: 700000,
          threshold_value: 0,
          excess_amount: 700000,
          remediation_priority: 'immediate',
          recommended_actions: ['Sell ABC Corp 3.5% 2029 immediately. Patch ESG screening workflows.']
        },
        {
          breach_id: 'BR004',
          severity: 'hard_breach',
          description: 'Direct holding in a Goldman Sachs affiliate security (Goldman Sachs Group 2.625% 2031, $1,000,000).',
          current_value: 1000000,
          threshold_value: 0,
          excess_amount: 1000000,
          remediation_priority: 'immediate',
          recommended_actions: ['Sell GS Group 2.625% 2031 position immediately. Strengthen issuer compliance checks.']
        },
        {
          breach_id: 'BR005',
          severity: 'soft_breach',
          description: 'Settled date cash exceeds 10% of portfolio value (current: 12.3%).',
          current_value: 0.123,
          threshold_value: 0.1,
          excess_amount: 0.023,
          remediation_priority: 'high',
          recommended_actions: ['Swiftly reinvest excess cash to bring below 10%. Improve cash management controls.']
        }
      ],
      remediation_summary: {
        immediate_actions_required: 2,
        estimated_total_cost: 18250,
        recommended_timeline: '1-7 business days depending on breach severity'
      }
    }
    setDashboardData(sampleDashboard)
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#1a365d] text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">GSAM Compliance Officer</h1>
            <p className="text-sm text-blue-200">Goldman Sachs Asset Management</p>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="text-white border-white">
              {new Date().toLocaleDateString()}
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Navigation Tabs */}
          <TabsList className="grid grid-cols-5 w-full max-w-4xl">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="portfolio" className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              Portfolio Database
            </TabsTrigger>
            <TabsTrigger value="agent" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Agent Interface
            </TabsTrigger>
            <TabsTrigger value="comparison" className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Version Comparison
            </TabsTrigger>
            <TabsTrigger value="library" className="flex items-center gap-2">
              <FileCheck className="w-4 h-4" />
              Rules Library
            </TabsTrigger>
          </TabsList>

          {/* Tab Content */}
          <TabsContent value="dashboard">
            <DashboardPage dashboard={dashboardData} />
          </TabsContent>

          <TabsContent value="portfolio">
            <PortfolioDatabasePage />
          </TabsContent>

          <TabsContent value="agent">
            <AgentInterfacePage />
          </TabsContent>

          <TabsContent value="comparison">
            <VersionComparisonPage />
          </TabsContent>

          <TabsContent value="library">
            <RulesLibraryPage />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
