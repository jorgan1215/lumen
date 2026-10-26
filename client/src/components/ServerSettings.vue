<template>
  <section class="settings-card">
    <h2>七牛云存储</h2>
    <div class="admin-form-grid">
      <label>存储空间 Bucket<input v-model="form.qiniu.bucket" class="field" /></label>
      <label>访问域名<input v-model="form.qiniu.domain" class="field" placeholder="https://cdn.example.com" /></label>
      <label>Access Key<input v-model="secrets.accessKey" type="password" autocomplete="new-password" class="field" :placeholder="form.qiniu.hasAccessKey ? '已保存，留空保留' : '填写 Access Key'" /></label>
      <label>Secret Key<input v-model="secrets.secretKey" type="password" autocomplete="new-password" class="field" :placeholder="form.qiniu.hasSecretKey ? '已保存，留空保留' : '填写 Secret Key'" /></label>
      <label>文件目录前缀<input v-model="form.qiniu.prefix" class="field" placeholder="photos/" /></label>
      <label>上传凭证有效期（秒）<input v-model.number="form.uploadTokenExpires" type="number" min="60" max="604800" class="field" /></label>
    </div>
    <h2 class="mt-4">服务与登录</h2>
    <div class="admin-form-grid">
      <label>服务端口<input v-model.number="form.port" type="number" min="1" max="65535" class="field" /></label>
      <label>登录有效期<input v-model="form.jwtExpiresIn" class="field" placeholder="7d" /></label>
      <label>管理员用户名<input v-model="form.admin.username" autocomplete="username" class="field" /></label>
      <label>新管理员密码<input v-model="secrets.password" type="password" autocomplete="new-password" class="field" placeholder="留空保留现有密码" /></label>
      <label class="admin-wide">JWT 签名密钥<input v-model="secrets.jwtSecret" type="password" autocomplete="new-password" class="field" placeholder="留空保留，修改时至少 32 位" /></label>
    </div>
    <p class="settings-note">密钥不回显，留空保留。修改登录凭据后需重新登录；端口修改在服务重启后生效，PORT 环境变量优先。七牛设置用于后续上传，不会修改已有照片地址。</p>
    <button class="btn-gold self-start" :disabled="busy || loading" @click="save">{{ busy ? '保存中…' : '保存服务配置' }}</button>
    <p v-if="message" :role="error ? 'alert' : 'status'" class="settings-note" :class="{'text-ember':error}">{{ message }}</p>
  </section>
</template>
<script setup lang="ts">
import { localePath } from '../lib/i18n';
import {onMounted,reactive,ref} from 'vue';
import {useRouter} from 'vue-router';
import {api,clearToken} from '../api';
const router=useRouter();
const emit=defineEmits<{saved: []}>();
const form=reactive({port:3001,activePort:3001,jwtExpiresIn:'7d',uploadTokenExpires:3600,hasJwtSecret:false,admin:{username:'',hasPassword:false},qiniu:{bucket:'',domain:'',prefix:'',hasAccessKey:false,hasSecretKey:false}});
const secrets=reactive({accessKey:'',secretKey:'',password:'',jwtSecret:''});
const loading=ref(true),busy=ref(false),message=ref(''),error=ref(false);
onMounted(async()=>{try{Object.assign(form,await api.serverConfig());}catch(e:any){message.value=e.message;error.value=true;}finally{loading.value=false;}});
async function save(){
  busy.value=true;message.value='';error.value=false;
  try{
    const result=await api.saveServerConfig({port:form.port,jwtExpiresIn:form.jwtExpiresIn,uploadTokenExpires:form.uploadTokenExpires,jwtSecret:secrets.jwtSecret,admin:{username:form.admin.username,password:secrets.password},qiniu:{bucket:form.qiniu.bucket,domain:form.qiniu.domain,prefix:form.qiniu.prefix,accessKey:secrets.accessKey,secretKey:secrets.secretKey}});
    Object.assign(form,result);Object.assign(secrets,{accessKey:'',secretKey:'',password:'',jwtSecret:''});
    window.dispatchEvent(new Event('lumen:settings-updated'));emit('saved');
    message.value=result.requiresRestart ? '已保存，端口将在重启服务后生效' : '服务配置已保存';
    if(result.requiresLogin){clearToken();router.push(localePath('/login'));}
  }catch(e:any){message.value=e.message;error.value=true;}finally{busy.value=false;}
}
</script>
