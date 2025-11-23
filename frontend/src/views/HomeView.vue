<script setup>
// 这里可以保留你之前用于 ping 和 db_test 的逻辑
import { ref, onMounted } from 'vue';

const backendPingResult = ref('Connecting...');
const dbTestResult = ref('Connecting...');

const fetchBackendStatus = async () => {
  try {
    const response = await fetch('/api/ping'); // 直接访问后端方便测试
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    backendPingResult.value = `Backend Ping: ${data.message} (${data.status})`;
  } catch (error) {
    backendPingResult.value = `Backend Ping failed: ${error.message}`;
  }
};

const fetchDbStatus = async () => {
  try {
    const response = await fetch('/api/db_test'); // 直接访问后端方便测试
     if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    dbTestResult.value = `DB Test: ${data.message} (${data.status})`;
  } catch (error) {
    dbTestResult.value = `DB Test failed: ${error.message}`;
  }
};

onMounted(() => {
  fetchBackendStatus();
  fetchDbStatus();
});
</script>

<template>
  <div>
    <h1>Welcome to the Drone Cluster Control Platform</h1>
    <p>This platform allows you to monitor and control your drone fleet.</p>
    <p>{{ backendPingResult }}</p>
    <p>{{ dbTestResult }}</p>
    <p>Please log in or register to get started.</p>
  </div>
</template>

<style scoped>
/* 页面特定样式 */
</style>