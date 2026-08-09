<script setup>
import { computed, nextTick, onBeforeUnmount, reactive, ref } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'

const MAX_FILES = 5
const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])

const form = reactive({
  contact: '',
  phone: '',
  email: '',
  description: '',
})
const errors = reactive({
  contact: '',
  phone: '',
  email: '',
  description: '',
})
const attachments = ref([])
const imageError = ref('')
const status = ref('idle')
const announcement = ref('')
const dragActive = ref(false)
const lastAttachmentCount = ref(0)
const fileInput = ref(null)
const contactInput = ref(null)
const phoneInput = ref(null)
const emailInput = ref(null)
const descriptionInput = ref(null)
let submitTimer = null
let attachmentSequence = 0

const isSubmitting = computed(() => status.value === 'submitting')
const isDirty = computed(() =>
  Boolean(form.contact || form.phone || form.email || form.description || attachments.value.length),
)

function clearFieldError(field) {
  errors[field] = ''
  if (status.value === 'error') status.value = 'idle'
}

function formatFileSize(bytes) {
  const megabytes = bytes / (1024 * 1024)
  if (megabytes < 1) {
    const kilobytes = Math.max(1, Math.round(bytes / 1024))
    return `${new Intl.NumberFormat('zh-CN').format(kilobytes)}\u00a0KB`
  }
  return `${new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 1 }).format(megabytes)}\u00a0MB`
}

function createAttachment(file) {
  attachmentSequence += 1
  return {
    id: globalThis.crypto?.randomUUID?.() || `feedback-image-${Date.now()}-${attachmentSequence}`,
    file,
    previewUrl: URL.createObjectURL(file),
  }
}

function addFiles(fileList) {
  imageError.value = ''
  const rejected = []
  const candidates = []

  for (const file of fileList) {
    if (!ALLOWED_TYPES.has(file.type)) {
      rejected.push(`${file.name}：仅支持 PNG、JPEG 或 WebP`)
      continue
    }
    if (file.size > MAX_FILE_SIZE) {
      rejected.push(`${file.name}：文件不能超过 5 MB`)
      continue
    }
    const duplicate = attachments.value.some((item) =>
      item.file.name === file.name && item.file.size === file.size && item.file.lastModified === file.lastModified,
    )
    if (duplicate) {
      rejected.push(`${file.name}：已添加相同图片`)
      continue
    }
    candidates.push(file)
  }

  const available = Math.max(0, MAX_FILES - attachments.value.length)
  if (candidates.length > available) {
    rejected.push(`最多添加 ${MAX_FILES} 张图片，请删除已有图片后再试`)
  }
  attachments.value.push(...candidates.slice(0, available).map(createAttachment))
  imageError.value = rejected.join('；')
}

function handleFileSelection(event) {
  addFiles(Array.from(event.target.files || []))
  event.target.value = ''
}

function handleDrop(event) {
  dragActive.value = false
  addFiles(Array.from(event.dataTransfer?.files || []))
}

function handlePaste(event) {
  const pastedImages = Array.from(event.clipboardData?.items || [])
    .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
    .map((item) => item.getAsFile())
    .filter(Boolean)
  if (pastedImages.length) addFiles(pastedImages)
}

function removeAttachment(id) {
  const index = attachments.value.findIndex((item) => item.id === id)
  if (index === -1) return
  URL.revokeObjectURL(attachments.value[index].previewUrl)
  attachments.value.splice(index, 1)
  imageError.value = ''
}

function clearAttachments() {
  attachments.value.forEach((item) => URL.revokeObjectURL(item.previewUrl))
  attachments.value = []
  imageError.value = ''
  if (fileInput.value) fileInput.value.value = ''
}

function validateForm() {
  Object.keys(errors).forEach((key) => { errors[key] = '' })
  const contact = form.contact.trim()
  const phone = form.phone.trim()
  const email = form.email.trim()
  const description = form.description.trim()
  const phoneDigits = phone.replace(/\D/g, '')

  if (contact.length < 2 || contact.length > 50) errors.contact = '联系人请输入 2–50 个字符。'
  if (!/^[+\d\s()-]+$/.test(phone) || phoneDigits.length < 6 || phoneDigits.length > 20) {
    errors.phone = '联系电话需包含 6–20 位数字，可使用空格、括号、加号或连字符。'
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    errors.email = '请输入有效的邮箱地址，例如 name@example.com。'
  }
  if (description.length < 10 || description.length > 2000) {
    errors.description = '问题描述请输入 10–2000 个字符。'
  }

  return !Object.values(errors).some(Boolean)
}

async function focusFirstError() {
  await nextTick()
  const fields = [
    ['contact', contactInput],
    ['phone', phoneInput],
    ['email', emailInput],
    ['description', descriptionInput],
  ]
  fields.find(([field]) => errors[field])?.[1].value?.focus()
}

async function submitFeedback() {
  if (!validateForm()) {
    status.value = 'error'
    announcement.value = '问题反馈未提交，请修正表单中的错误。'
    await focusFirstError()
    return
  }

  status.value = 'submitting'
  announcement.value = '正在模拟提交问题反馈…'
  submitTimer = window.setTimeout(() => {
    lastAttachmentCount.value = attachments.value.length
    form.contact = ''
    form.phone = ''
    form.email = ''
    form.description = ''
    clearAttachments()
    status.value = 'success'
    announcement.value = '演示提交完成。内容没有发送或保存。'
    submitTimer = null
  }, 800)
}

async function resetForAnother() {
  status.value = 'idle'
  announcement.value = '可以填写新的问题反馈。'
  await nextTick()
  contactInput.value?.focus()
}

function beforeUnload(event) {
  if (!isDirty.value) return
  event.preventDefault()
  event.returnValue = ''
}

onBeforeRouteLeave(() => {
  if (!isDirty.value) return true
  return window.confirm('当前问题反馈尚未提交，确定离开此页面吗？')
})

window.addEventListener('beforeunload', beforeUnload)
onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', beforeUnload)
  if (submitTimer) window.clearTimeout(submitTimer)
  clearAttachments()
})
</script>

<template>
  <section class="full-view feedback-view" aria-labelledby="feedback-title">
    <header class="view-heading">
      <div>
        <p class="utility-label">SERVICE / ISSUE REPORT</p>
        <h1 id="feedback-title">问题反馈</h1>
        <p>记录操作中遇到的现象和联系信息，并用图片补充现场细节。</p>
      </div>
      <span class="demo-warning"><i aria-hidden="true">!</i>仅前端演示</span>
    </header>

    <div class="feedback-notice" role="note">
      <strong>隐私与数据边界</strong>
      <p>本页面不会发送或保存联系人、电话、邮箱、问题描述及图片。刷新或离开页面后，尚未提交的内容会丢失。</p>
    </div>

    <div v-if="status === 'success'" class="feedback-success" aria-labelledby="feedback-success-title">
      <div class="feedback-success-mark" aria-hidden="true">✓</div>
      <div>
        <p class="utility-label">SIMULATION COMPLETE</p>
        <h2 id="feedback-success-title">演示提交完成</h2>
        <p>表单校验已完成，{{ lastAttachmentCount }} 张图片已从浏览器内存中清除。所有内容均未发送或保存。</p>
        <button class="button button-primary" type="button" @click="resetForAnother">再提交一条</button>
      </div>
    </div>

    <div v-else class="feedback-layout">
      <form class="feedback-form-panel" novalidate @submit.prevent="submitFeedback">
        <div class="section-heading">
          <div><span class="utility-label">ISSUE FORM</span><h2>填写问题信息</h2></div>
          <span><b aria-hidden="true">*</b> 必填字段</span>
        </div>

        <div class="form-grid">
          <label class="field">
            <span>联系人 <b aria-hidden="true">*</b></span>
            <input
              ref="contactInput"
              v-model="form.contact"
              name="contact"
              type="text"
              autocomplete="name"
              minlength="2"
              maxlength="50"
              placeholder="例如：王工…"
              required
              :aria-invalid="Boolean(errors.contact)"
              :aria-describedby="errors.contact ? 'contact-error' : undefined"
              @input="clearFieldError('contact')"
            />
            <span v-if="errors.contact" id="contact-error" class="field-error">{{ errors.contact }}</span>
          </label>

          <label class="field">
            <span>联系电话 <b aria-hidden="true">*</b></span>
            <input
              ref="phoneInput"
              v-model="form.phone"
              name="phone"
              type="tel"
              inputmode="tel"
              autocomplete="tel"
              maxlength="32"
              placeholder="例如：138 0000 0000…"
              required
              :aria-invalid="Boolean(errors.phone)"
              :aria-describedby="errors.phone ? 'phone-error' : undefined"
              @input="clearFieldError('phone')"
            />
            <span v-if="errors.phone" id="phone-error" class="field-error">{{ errors.phone }}</span>
          </label>

          <label class="field field-wide">
            <span>本人邮箱 <b aria-hidden="true">*</b></span>
            <input
              ref="emailInput"
              v-model="form.email"
              name="email"
              type="email"
              inputmode="email"
              autocomplete="email"
              maxlength="254"
              spellcheck="false"
              placeholder="例如：name@example.com…"
              required
              :aria-invalid="Boolean(errors.email)"
              :aria-describedby="errors.email ? 'email-error' : undefined"
              @input="clearFieldError('email')"
            />
            <span v-if="errors.email" id="email-error" class="field-error">{{ errors.email }}</span>
          </label>

          <label class="field field-wide">
            <span>问题描述 <b aria-hidden="true">*</b></span>
            <textarea
              ref="descriptionInput"
              v-model="form.description"
              name="description"
              autocomplete="off"
              minlength="10"
              maxlength="2000"
              rows="8"
              placeholder="请描述设备系列、操作步骤、当前现象和期望结果…"
              required
              :aria-invalid="Boolean(errors.description)"
              :aria-describedby="errors.description ? 'description-error description-count' : 'description-count'"
              @input="clearFieldError('description')"
              @paste="handlePaste"
            ></textarea>
            <span class="field-meta"><span v-if="errors.description" id="description-error" class="field-error">{{ errors.description }}</span><span id="description-count" class="mono">{{ form.description.length }} / 2000</span></span>
          </label>
        </div>

        <fieldset class="attachment-fieldset">
          <legend>图片附件 <span>可选</span></legend>
          <div
            class="attachment-dropzone"
            :class="{ active: dragActive }"
            @dragenter.prevent="dragActive = true"
            @dragover.prevent="dragActive = true"
            @dragleave="dragActive = false"
            @drop.prevent="handleDrop"
          >
            <input
              ref="fileInput"
              class="sr-only"
              name="feedback-images"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              tabindex="-1"
              @change="handleFileSelection"
            />
            <div class="attachment-symbol" aria-hidden="true">IMG</div>
            <div>
              <strong>添加现场图片</strong>
              <p id="attachment-help">选择、拖放或在问题描述中粘贴图片。支持 PNG、JPEG、WebP，最多 5 张，每张不超过 5&nbsp;MB。</p>
            </div>
            <button class="button button-secondary" type="button" aria-describedby="attachment-help" @click="fileInput?.click()">选择图片</button>
          </div>
          <p v-if="imageError" class="attachment-error" role="alert">{{ imageError }}</p>

          <ul v-if="attachments.length" class="attachment-list" aria-label="已添加的图片">
            <li v-for="(attachment, index) in attachments" :key="attachment.id">
              <img :src="attachment.previewUrl" :alt="`问题附件预览：${attachment.file.name}`" width="112" height="84" loading="lazy" />
              <div><span class="utility-label">IMAGE / {{ String(index + 1).padStart(2, '0') }}</span><strong>{{ attachment.file.name }}</strong><small>{{ formatFileSize(attachment.file.size) }}</small></div>
              <button class="icon-button attachment-remove" type="button" :aria-label="`删除图片 ${attachment.file.name}`" @click="removeAttachment(attachment.id)">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
              </button>
            </li>
          </ul>
        </fieldset>

        <div class="feedback-form-actions">
          <p>提交只会触发当前页面的演示成功状态。</p>
          <button class="button button-primary" type="submit" :disabled="isSubmitting">
            <span v-if="isSubmitting" class="button-spinner" aria-hidden="true"></span>
            {{ isSubmitting ? '正在模拟提交…' : '提交问题' }}
          </button>
        </div>
      </form>

      <aside class="feedback-protocol" aria-labelledby="feedback-protocol-title">
        <p class="utility-label">REPORT PROTOCOL</p>
        <h2 id="feedback-protocol-title">描述问题的顺序</h2>
        <ol>
          <li><span>01</span><div><strong>定位设备</strong><p>写明 S7 系列、操作页面和模拟场景。</p></div></li>
          <li><span>02</span><div><strong>复现现象</strong><p>按发生顺序说明操作、结果与错误提示。</p></div></li>
          <li><span>03</span><div><strong>补充证据</strong><p>添加能显示状态、参数或故障位置的图片。</p></div></li>
        </ol>
        <div class="feedback-boundary">
          <span class="mono">LOCAL / MEMORY ONLY</span>
          <strong>不连接反馈服务</strong>
          <p>图片仅使用临时预览地址，不转换为 Base64，也不发起网络请求。</p>
        </div>
      </aside>
    </div>

    <div class="sr-only" aria-live="polite">{{ announcement }}</div>
  </section>
</template>
