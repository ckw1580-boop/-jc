<script setup>
import { RouterLink } from 'vue-router'
</script>

<template>
  <section class="full-view help-view" aria-labelledby="help-title">
    <header class="view-heading">
      <div>
        <p class="utility-label">HELP / OPERATOR GUIDE</p>
        <h1 id="help-title">帮助与使用说明</h1>
        <p>了解模拟模式、本地实际连接边界和常见操作。</p>
      </div>
      <RouterLink class="button button-primary" to="/connection/status">打开连接工作站</RouterLink>
    </header>

    <div class="help-layout">
      <section class="quick-start" aria-labelledby="quick-start-title">
        <div class="section-heading"><div><span class="utility-label">QUICK START</span><h2 id="quick-start-title">4 步开始使用</h2></div></div>
        <ol>
          <li><span>01</span><div><strong>选择连接通道</strong><p>模拟连接用于界面演示；实际连接需要先安装 Windows 本地网关。</p></div></li>
          <li><span>02</span><div><strong>配对实际网关</strong><p>从 Windows 托盘读取六位码，PLC 参数和数据不会经过 Netlify。</p></div></li>
          <li><span>03</span><div><strong>配置实际变量</strong><p>逐行录入 DB/I/Q/M 绝对地址，或导入 TIA Portal CSV 后开始监控。</p></div></li>
          <li><span>04</span><div><strong>安全确认写入</strong><p>实际模式默认只读；每次写入都要确认，并由网关回读验证。</p></div></li>
        </ol>
      </section>

      <section class="page-map" aria-labelledby="page-map-title">
        <div class="section-heading"><div><span class="utility-label">PAGE MAP</span><h2 id="page-map-title">页面用途</h2></div></div>
        <dl>
          <div><dt>首页</dt><dd>查看使用流程与 S7 系列基础定位。</dd></div>
          <div><dt>连接</dt><dd>选择前端模拟器或 localhost 网关，并观察连接诊断。</dd></div>
          <div><dt>交互界面</dt><dd>监视模拟变量，或配置实际绝对地址并执行受控写入。</dd></div>
          <div><dt>错误信息手册</dt><dd>搜索模拟与 REAL-* 本项目诊断条目。</dd></div>
          <div><dt>设置</dt><dd>调整主题、密度与变量刷新周期。</dd></div>
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
        <summary>实际连接为什么需要 Windows 本地网关？</summary>
        <p>浏览器不能直接建立 S7 协议使用的 TCP 102 连接，Netlify 云端也无法访问用户局域网。网关只监听 localhost，并在本机连接 PLC。</p>
      </details>
      <details>
        <summary>实际连接前需要怎样配置 PLC？</summary>
        <p>S7-1200/1500 必须启用 PUT/GET，并为相关用户授予权限；通过偏移量读取的 DB 必须关闭优化块访问。该设置会扩大 PLC 的访问面，只能在受控工业网络和测试设备中启用。</p>
      </details>
      <details>
        <summary>可以读取 TIA Portal 中的默认变量表吗？</summary>
        <p>可以导出 CSV 后导入名称、数据类型和绝对地址。当前 PUT/GET 版本不在线浏览符号，也不能通过偏移量读取优化 DB。</p>
      </details>
      <details>
        <summary>为什么刷新页面后 PLC 变为未连接？</summary>
        <p>连接、配对后的写入解锁和实时值不会持久化，避免刷新后显示虚假在线。实际变量地址仅按当前用户保存在本机浏览器中。</p>
      </details>
      <details>
        <summary>SIM-* 或 REAL-* 错误代码可以用于设备维修吗？</summary>
        <p>不可以。它们都是本项目的界面诊断码。真实设备诊断必须以对应 PLC 型号、固件版本、TIA Portal 缓冲区和 Siemens 官方手册为准。</p>
      </details>
      <details>
        <summary>S7-1200 与 S7-1500 的文字是否可用于选型？</summary>
        <p>页面只提供系列定位概览，不包含完整技术参数。正式选型应使用 Siemens 官方产品资料和选型工具。</p>
      </details>
    </section>

    <footer class="legal-note">
      <strong>使用与商标声明</strong>
      <p>本项目是非官方工业控制工具。实际写入具有机械、人身和生产风险，只能由具备 PLC 调试能力的人员在隔离测试设备上使用。Siemens、SIMATIC、S7-1200 与 S7-1500 为其各自权利人拥有的名称或商标。</p>
    </footer>
  </section>
</template>
