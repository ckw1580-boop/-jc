<script setup>
import { RouterLink } from 'vue-router'
</script>

<template>
  <section class="full-view help-view" aria-labelledby="help-title">
    <header class="view-heading">
      <div>
        <p class="utility-label">HELP / OPERATOR GUIDE</p>
        <h1 id="help-title">帮助与使用说明</h1>
        <p>了解页面用途、模拟边界和常见操作。</p>
      </div>
      <RouterLink class="button button-primary" to="/connection/status">开始模拟连接</RouterLink>
    </header>

    <div class="help-layout">
      <section class="quick-start" aria-labelledby="quick-start-title">
        <div class="section-heading"><div><span class="utility-label">QUICK START</span><h2 id="quick-start-title">4 步开始使用</h2></div></div>
        <ol>
          <li><span>01</span><div><strong>打开连接页</strong><p>选择 PLC 系列并确认模拟 IP、机架和插槽。</p></div></li>
          <li><span>02</span><div><strong>选择演示场景</strong><p>正常连接、连接超时和组态不匹配都可重复复现。</p></div></li>
          <li><span>03</span><div><strong>监视模拟变量</strong><p>连接成功后进入交互界面，观察 I/O、设定值与趋势。</p></div></li>
          <li><span>04</span><div><strong>查看处理建议</strong><p>从连接故障提示跳转到错误信息手册查看演示步骤。</p></div></li>
        </ol>
      </section>

      <section class="page-map" aria-labelledby="page-map-title">
        <div class="section-heading"><div><span class="utility-label">PAGE MAP</span><h2 id="page-map-title">页面用途</h2></div></div>
        <dl>
          <div><dt>首页</dt><dd>查看使用流程与 S7 系列基础定位。</dd></div>
          <div><dt>连接</dt><dd>配置前端模拟设备并观察连接状态。</dd></div>
          <div><dt>交互界面</dt><dd>监视和修改演示变量，查看模拟趋势。</dd></div>
          <div><dt>错误信息手册</dt><dd>搜索演示诊断条目和建议处理步骤。</dd></div>
          <div><dt>设置</dt><dd>调整主题、密度与模拟刷新周期。</dd></div>
          <div><dt>帮助</dt><dd>查看快速开始、边界与常见问题。</dd></div>
          <div><dt>问题反馈</dt><dd>填写联系信息、问题描述和图片附件，提交后由 Netlify Functions 安全保存。</dd></div>
        </dl>
      </section>
    </div>

    <section class="faq-section" aria-labelledby="faq-title">
      <div class="section-heading"><div><span class="utility-label">FAQ</span><h2 id="faq-title">常见问题</h2></div></div>
      <details>
        <summary>问题反馈会保存在哪里？</summary>
        <p>联系人、电话、邮箱和描述保存在 Netlify Database，图片附件保存在 Netlify Blobs，仅具有 admin 角色的受邀管理员可以查看。</p>
      </details>
      <details>
        <summary>页面会连接真实 PLC 吗？</summary>
        <p>不会。所有状态和变量都由浏览器中的前端模拟器生成，不会向局域网设备发送请求。</p>
      </details>
      <details>
        <summary>为什么刷新页面后 PLC 变为未连接？</summary>
        <p>连接状态不会持久化，避免刷新后显示虚假在线状态。主题、密度和刷新周期会保存在浏览器中。</p>
      </details>
      <details>
        <summary>SIM-* 错误代码可以用于设备维修吗？</summary>
        <p>不可以。它们只用于演示错误手册界面。真实诊断必须以对应 PLC 型号、固件版本和 Siemens 官方手册为准。</p>
      </details>
      <details>
        <summary>S7-1200 与 S7-1500 的文字是否可用于选型？</summary>
        <p>页面只提供系列定位概览，不包含完整技术参数。正式选型应使用 Siemens 官方产品资料和选型工具。</p>
      </details>
    </section>

    <footer class="legal-note">
      <strong>使用与商标声明</strong>
      <p>本项目是非官方前端界面演示。Siemens、SIMATIC、S7-1200 与 S7-1500 为其各自权利人拥有的名称或商标；页面未使用官方 Logo、产品照片或官方诊断代码。</p>
    </footer>
  </section>
</template>
