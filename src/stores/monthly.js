import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { monthlyApi } from '../api/index.js'

const EMPTY_ROW = () => ({
  plan: '',
  target: '',
  weight: 0,
  standard: '',
  completion: '',
  score: 0
})

export const useMonthlyStore = defineStore('monthly', () => {
  // 当前选中月份
  const currentMonth = ref(getThisMonth())

  // 月报行数据
  const rows = ref([])

  // 状态
  const loading = ref(false)
  const generating = ref(false)
  const generateStream = ref('') // 流式输出缓冲
  const saving = ref(false)
  const hasSaved = ref(false)
  const updatedAt = ref(null)

  // 该月日报条数（从外部写入）
  const dailyCount = ref(0)

  // 权重合计
  const totalWeight = computed(() => rows.value.reduce((sum, r) => sum + (Number(r.weight) || 0), 0))
  const weightValid = computed(() => totalWeight.value === 100)

  function getThisMonth() {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
  }

  function addRow() {
    rows.value.push(EMPTY_ROW())
  }

  function removeRow(index) {
    rows.value.splice(index, 1)
  }

  function setRows(data) {
    rows.value = Array.isArray(data) ? data.map(r => ({ ...EMPTY_ROW(), ...r })) : []
  }

  function resetRows() {
    rows.value = []
    generateStream.value = ''
    hasSaved.value = false
    updatedAt.value = null
  }

  async function loadMonthly(month) {
    loading.value = true
    try {
      const data = await monthlyApi.get(month)
      if (data && data.rows) {
        setRows(data.rows)
        updatedAt.value = data.updatedAt
        hasSaved.value = true
      } else {
        resetRows()
      }
    } catch (e) {
      // 404 表示还没有草稿
      if (e.message.includes('404') || e.message.includes('not found')) {
        resetRows()
      } else {
        throw e
      }
    } finally {
      loading.value = false
    }
  }

  async function saveMonthly() {
    saving.value = true
    try {
      await monthlyApi.save(currentMonth.value, { rows: rows.value })
      updatedAt.value = new Date().toISOString()
      hasSaved.value = true
    } finally {
      saving.value = false
    }
  }

  return {
    currentMonth,
    rows,
    loading,
    generating,
    generateStream,
    saving,
    hasSaved,
    updatedAt,
    dailyCount,
    totalWeight,
    weightValid,
    getThisMonth,
    addRow,
    removeRow,
    setRows,
    resetRows,
    loadMonthly,
    saveMonthly
  }
})
