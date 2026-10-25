<template>
  <section class="settings-card">
    <h2>AI 模型配置</h2><p class="settings-note">默认使用官方 DeepSeek Flash，兼容 Chat Completions 接口。照片生成需要模型支持图片输入。</p>
    <label>API 基础地址<input v-model="form.baseUrl" class="field" placeholder="https://api.deepseek.com" /></label>
    <label>模型 ID<input v-model="form.model" class="field" placeholder="deepseek-flash" /></label>
    <label>API Key<input v-model="key" type="password" class="field" autocomplete="new-password" :placeholder="form.hasApiKey ? '已保存密钥；留空保留' : '填写 API Key'" /></label>
    <label class="settings-check"><input v-model="form.vision" type="checkbox" /> 支持图片输入</label>
    <label v-if="form.hasApiKey" class="settings-check"><input v-model="clearKey" type="checkbox" /> 清除已保存密钥</label>
    <button class="btn-gold w-full" :disabled="busy || loading" @click="save">{{ busy ? '保存中…' : '保存模型配置' }}</button>
    <p class="settings-note">密钥仅保存在服务端，不返回浏览器。生成时素材会发送给此处配置的服务商。</p>
    <p v-if="message" :role="error ? 'alert' : 'status'" class="settings-note" :class="{'text-ember': error}">{{ message }}</p>
  </section>
</template>
<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { api } from '../api';
const form = reactive({ baseUrl: 'https://api.deepseek.com', model: 'deepseek-flash', vision: true, hasApiKey: false });
const key = ref(''), clearKey = ref(false), busy = ref(false), loading = ref(true), message = ref(''), error = ref(false);
onMounted(async () => { try { Object.assign(form, await api.aiConfig()); } catch(e: any) { message.value = e.message; error.value = true; } finally { loading.value = false; } });
async function save() { busy.value = true; error.value = false; message.value = ''; try { Object.assign(form, await api.saveAIConfig({ ...form, apiKey: key.value, clearApiKey: clearKey.value })); key.value = ''; clearKey.value = false; message.value = '模型配置已保存'; } catch(e: any) { message.value = e.message; error.value = true; } finally { busy.value = false; } }
</script>
