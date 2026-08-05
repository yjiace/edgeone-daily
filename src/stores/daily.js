import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { dailyApi } from '../api/index.js'

export const useDailyStore = defineStore('daily', () => {
  // 当前编辑的日报
  const current = ref({
    date: getTodayStr(),
    raw: '',
    title: '',
    polished: '',
    updatedAt: null
  })

  // 日报列表（按月缓存）
  const listCache = ref({}) // { 'YYYY-MM': [...] }
  const listLoading = ref(false)

  // 润色状态
  const polishing = ref(false)
  const polishStream = ref('') // 流式输出缓冲

  // 保存状态
  const saving = ref(false)

  function getTodayStr() {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  }

  function resetCurrent(date = null) {
    current.value = {
      date: date || getTodayStr(),
      raw: '',
      title: '',
      polished: '',
      updatedAt: null
    }
    polishStream.value = ''
  }

  async function loadByDate(date) {
    try {
      const data = await dailyApi.get(date)
      current.value = { ...data }
      polishStream.value = ''
    } catch (e) {
      // 无论 404、545 还是网络失败，统统静默重置为新日报状态
      resetCurrent(date)
    }
  }

  async function fetchList(month) {
    listLoading.value = true
    try {
      const data = await dailyApi.listByMonth(month)
      listCache.value[month] = data.items || []
    } finally {
      listLoading.value = false
    }
  }

  async function saveCurrentDaily() {
    saving.value = true
    try {
      await dailyApi.save(current.value.date, {
        raw: current.value.raw,
        title: current.value.title,
        polished: current.value.polished
      })
      current.value.updatedAt = new Date().toISOString()
      // 清除该月的列表缓存，强制下次重新加载
      const month = current.value.date.slice(0, 7)
      delete listCache.value[month]
    } finally {
      saving.value = false
    }
  }

  async function deleteDaily(date) {
    await dailyApi.delete(date)
    const month = date.slice(0, 7)
    delete listCache.value[month]
  }

  return {
    current,
    listCache,
    listLoading,
    polishing,
    polishStream,
    saving,
    getTodayStr,
    resetCurrent,
    loadByDate,
    fetchList,
    saveCurrentDaily,
    deleteDaily
  }
})
