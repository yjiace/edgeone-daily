<template>
  <div class="page-container">
    <div class="page-header">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="page-title">✍️ 写日报</h1>
          <p class="page-subtitle">记录今天的工作，让 AI 帮你润色</p>
        </div>
        <div class="flex gap-sm">
          <input
            id="daily-date-input"
            type="date"
            v-model="store.current.date"
            class="form-input date-picker"
            @change="onDateChange"
          />
        </div>
      </div>
    </div>

    <DailyEditor />
  </div>
</template>

<script setup>
import { onMounted, inject } from 'vue'
import { useRoute } from 'vue-router'
import { useDailyStore } from '../stores/daily.js'
import DailyEditor from '../components/DailyEditor.vue'

const store = useDailyStore()
const route = useRoute()
const showToast = inject('showToast')

onMounted(async () => {
  const dateParam = route.query.date
  if (dateParam) {
    await store.loadByDate(dateParam)
  } else {
    // 默认加载今天，如果今天有记录则展示
    await store.loadByDate(store.getTodayStr())
  }
})

async function onDateChange() {
  await store.loadByDate(store.current.date)
}
</script>

<style scoped>
.date-picker {
  width: auto;
  min-width: 160px;
  color-scheme: dark;
}
</style>
