<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { login } from '../api/auth';

const username = ref('');
const password = ref('');
const error = ref('');
const router = useRouter();

const handleSubmit = async () => {
  error.value = '';
  try {
    const data = await login(username.value, password.value);
    
    // 1. 存储 Token
    localStorage.setItem('token', data.token);
    
    // 2. 存储用户信息 (适配新的后端返回结构: data.user 包含 username 和 coins)
    // 如果后端返回的是 { token: '...', user: { username: '...', coins: ... } }
    if (data.user) {
      localStorage.setItem('user', JSON.stringify(data.user));
    } else {
      // 兼容旧逻辑或作为后备
      localStorage.setItem('user', JSON.stringify({ username: username.value }));
    }

    // 手动触发存储事件以更新 App.vue 状态
    window.dispatchEvent(new Event('storage')); 
    
    // 3. 跳转到游戏主界面
    router.push('/game'); 

  } catch (err) {
    error.value = err.message || 'Login failed. Please check your credentials.';
  }
};
</script>

<template>
  <div>
    <h1>Login to Anno Game</h1> <form @submit.prevent="handleSubmit">
      <div>
        <label for="username">Username:</label>
        <input
          type="text"
          id="username"
          v-model="username"
          required
        />
      </div>
      <div>
        <label for="password">Password:</label>
        <input
          type="password"
          id="password"
          v-model="password"
          required
        />
      </div>
      <p v-if="error" style="color: red;">{{ error }}</p>
      <button type="submit">Login & Start Game</button>
    </form>
  </div>
</template>

<style scoped>
/* 你可以保留原有的样式 */
</style>