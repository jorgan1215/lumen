<template>
  <main class="flex min-h-screen items-center justify-center px-6">
    <div class="fade-up w-full max-w-sm">
      <p class="text-center font-mono text-[10px] uppercase tracking-[0.4em] text-gold/70">Admin</p>
      <h1 class="mt-3 text-center font-serif text-3xl font-semibold">管理登录</h1>

      <form class="mt-10 space-y-4" @submit.prevent="submit">
        <input v-model="username" class="field" placeholder="用户名" autocomplete="username" />
        <input v-model="password" type="password" class="field" placeholder="密码" autocomplete="current-password" />
        <p v-if="error" class="text-xs text-ember">{{ error }}</p>
        <button type="submit" class="btn-gold w-full" :disabled="loading">
          {{ loading ? '登录中…' : '登录' }}
        </button>
      </form>

      <p class="mt-8 text-center font-mono text-[10px] text-bone/30">
        账号密码配置在 server/config.json 的 admin 字段
      </p>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { api, setToken } from '../api';

const router = useRouter();
const route = useRoute();
const username = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

async function submit() {
  error.value = '';
  loading.value = true;
  try {
    const { token } = await api.login(username.value, password.value);
    setToken(token);
    router.push((route.query.redirect as string) || '/admin');
  } catch (e: any) {
    error.value = e.message || '登录失败';
  } finally {
    loading.value = false;
  }
}
</script>
