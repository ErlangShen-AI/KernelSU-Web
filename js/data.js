window.KernelSU = window.KernelSU || {};

KernelSU.data = (function () {
  'use strict';

  var RELEASE_ENDPOINT = 'https://api.github.com/repos/tiann/KernelSU/releases/latest';
  var CLOUD_GAME_URL = 'https://ys.mihoyo.com/cloud/m/#/';
  var FALLBACK_MANAGER_TAG = 'v3.2.4';
  var FALLBACK_MANAGER_CODE = 32457;

  var FAKE_DEVICES = [
    { m: 'iPhone 91 Pro Max', o: 'iOS 99', k: 'XNU-29999' }, { m: 'Huawei Mate 78', o: 'HarmonyOS 99', k: '6.6.99-hos' },
    { m: 'OPPO Vivo X', o: 'ColorOS 99', k: '5.15.199-color' }, { m: 'Samsung Galaxy S99', o: 'OneUI 99', k: '6.1.99-oneui' },
    { m: 'Xiaomi 28 Ultra', o: 'HyperOS 99', k: '6.6.99-hyper' }, { m: 'Google Pixel 19', o: 'Android 99', k: '6.6.99-aosp' },
    { m: 'OnePlus 25', o: 'OxygenOS 99', k: '5.10.299-oplus' }, { m: 'Sony Xperia 9', o: 'Android 99', k: '5.15.199-sony' },
    { m: 'Nothing Phone 5', o: 'NothingOS 99', k: '6.1.99-nothing' }, { m: 'Motorola Edge 50', o: 'Android 99', k: '5.10.299-moto' },
    { m: 'ASUS ROG 10', o: 'Android 99', k: '6.6.99-asus' }, { m: 'Realme GT 8', o: 'RealmeUI 99', k: '5.15.199-realme' }
  ];

  // 按 UserAgent 判定平台，未命中时回落到内置机型表
  function detectDevice() {
    var ua = navigator.userAgent;
    var cores = navigator.hardwareConcurrency || '?';
    var memory = navigator.deviceMemory ? navigator.deviceMemory + 'GB' : '?';
    var base = { selinux: 'Enforcing', seccomp: 'Filter', cores: cores, mem: memory, ver: 'v3.2.4 (32457)' };

    var androidVersion = ua.match(/Android\s+([\d.]+)/);
    if (androidVersion) {
      var version = androidVersion[1];
      var model = 'Xiaomi 14 Pro';
      var parens = ua.match(/\(.*?;\s*(.*?)\s*\)/);
      if (parens) {
        var segments = parens[1].split(';').map(function (part) { return part.trim(); });
        var name = segments.filter(function (part) {
          return part && part.indexOf('Android') !== 0 && part.indexOf('Linux') !== 0;
        })[0];
        if (name) model = name;
      }
      return {
        selinux: base.selinux, seccomp: base.seccomp, cores: cores, mem: memory,
        ver: base.ver, model: model,
        kernel: '5.10.' + (Math.floor(Math.random() * 200) + 100) + '-android' + version,
        fp: model.replace(/\s/g, '') + ':' + version + '/' + cores + '/' + memory,
        os: 'Android ' + version
      };
    }

    if (/iPhone|iPad/.test(ua)) {
      var iosMatch = ua.match(/iPhone OS ([\d_]+)/);
      var iosVersion = (iosMatch ? iosMatch[1] : '').replace(/_/g, '.');
      var deviceMatch = ua.match(/\(.*?;(.*?)\)/);
      var candidates = (deviceMatch ? deviceMatch[1] : '').split(';');
      return {
        selinux: base.selinux, seccomp: base.seccomp, cores: cores, mem: memory, ver: base.ver,
        model: candidates.filter(function (part) { return /iPhone|iPad/.test(part); })[0] || 'Apple Device',
        kernel: 'XNU-' + (Math.floor(Math.random() * 10000) + 8000),
        fp: 'apple/' + cores + '/' + memory,
        os: iosVersion ? 'iOS ' + iosVersion : 'iOS'
      };
    }

    if (/Macintosh/.test(ua)) {
      var macMatch = ua.match(/Mac OS X ([\d_]+)/);
      var macVersion = (macMatch ? macMatch[1] : '').replace(/_/g, '.');
      return {
        selinux: base.selinux, seccomp: base.seccomp, cores: cores, mem: memory, ver: base.ver,
        model: 'Mac', kernel: macVersion ? 'Darwin ' + macVersion : 'Darwin',
        fp: 'apple/' + cores + '/' + memory, os: 'macOS'
      };
    }

    if (/Windows/.test(ua)) {
      var ntMatch = ua.match(/Windows NT ([\d.]+)/);
      var ntVersion = ntMatch ? ntMatch[1] : '';
      return {
        selinux: base.selinux, seccomp: base.seccomp, cores: cores, mem: memory, ver: base.ver,
        model: 'PC', kernel: 'NT ' + ntVersion, fp: 'windows/' + cores + '/' + memory, os: 'Windows ' + ntVersion
      };
    }

    var fake = FAKE_DEVICES[Math.floor(Math.random() * FAKE_DEVICES.length)];
    return {
      selinux: base.selinux, seccomp: base.seccomp, cores: cores, mem: memory, ver: base.ver,
      model: fake.m, os: fake.o, kernel: fake.k, fp: 'Xiaomi/shennong:14'
    };
  }

  var INSTALLED_MODULES = [
    { n: 'Zygisk Next', v: 'v4-1.0.4', a: 'Dr-TSNG', d: 'Standalone Zygisk providing Zygisk module support for KernelSU and APatch.', e: 1 },
    { n: 'LSPosed', v: 'v1.10.0', a: 'LSPosed', d: 'A Xposed framework that works on ART with Android 13+ support.', e: 1 },
    { n: 'Play Integrity Fix', v: 'v16.5', a: 'chiteroman', d: 'Fix Play Integrity and SafetyNet attestation on rooted devices.', e: 1 },
    { n: 'Shamiko', v: 'v1.2.1', a: 'LSPosed', d: 'Zygisk module to hide root and Zygisk detection from apps.', e: 1 },
    { n: 'Busybox-NDK', v: '1.36.1', a: 'Magisk-Modules-Repo', d: 'Essential Unix commands for Android powered by Busybox.', e: 1 },
    { n: 'Systemless Hosts', v: 'v1.4', a: 'topjohnwu', d: 'Systemless hosts file module for ad-blocking.', e: 1 },
    { n: 'Bootloop Saver', v: 'v2.1', a: 'KernelSU', d: 'Prevent bootloop by auto-disabling all modules on failed system boot.', e: 1 },
    { n: 'MiUI Optimization', v: 'v5.0', a: 'XiaomiTool', d: 'Remove system ads and optimize performance for Xiaomi devices.', e: 1 },
    { n: 'SafetyNet Fix', v: 'v3.0.2', a: 'kdrag0n', d: 'Fix SafetyNet and Play Integrity attestation on devices with unlocked bootloader.', e: 1 },
    { n: 'Webview Manager', v: 'v4.2', a: 'Rovzen', d: 'Manage and switch between different WebView implementations on your device.', e: 1 }
  ];

  var REPOSITORY_MODULES = [
    { n: 'Zygisk Next', a: 'Dr-TSNG', d: 'Standalone Zygisk', s: 2800, u: '2024-01-10' },
    { n: 'LSPosed', a: 'LSPosed', d: 'Xposed framework', s: 15000, u: '2024-01-08' },
    { n: 'Play Integrity Fix', a: 'chiteroman', d: 'Fix Play Integrity', s: 5200, u: '2024-01-12' },
    { n: 'Shamiko', a: 'LSPosed', d: 'Hide root detection', s: 4300, u: '2024-01-05' },
    { n: 'Busybox-NDK', a: 'Magisk-Modules-Repo', d: 'Essential Unix commands', s: 1200, u: '2024-01-01' },
    { n: 'Systemless Hosts', a: 'topjohnwu', d: 'Ad-blocking hosts', s: 3400, u: '2023-12-28' },
    { n: 'SafetyNet Fix', a: 'kdrag0n', d: 'Fix SafetyNet', s: 8900, u: '2024-01-11' },
    { n: 'Webview Manager', a: 'Rovzen', d: 'Manage WebViews', s: 760, u: '2023-12-15' }
  ];

  return {
    device: detectDevice(),
    releaseEndpoint: RELEASE_ENDPOINT,
    cloudGameUrl: CLOUD_GAME_URL,
    fallbackManagerTag: FALLBACK_MANAGER_TAG,
    fallbackManagerCode: FALLBACK_MANAGER_CODE,
    superuserApp: { label: '云·原神', pkg: 'com.miHoYo.cloudgames.ys' },
    installedModules: INSTALLED_MODULES,
    repositoryModules: REPOSITORY_MODULES,
    labels: {
      uiStyles: ['Material', 'Miuix'],
      legacySuModes: ['启用（默认）', '禁用直到下次重启', '始终禁用'],
      themeModes: ['跟随系统', '浅色', '深色'],
      superuserSort: ['应用名', '包名', '安装时间', '更新时间', '倒序'],
      superuserFilter: ['显示系统应用', '只显示主用户应用'],
      moduleSort: ['可执行优先', '已启用优先'],
      reboot: ['软重启', '用户空间重启', '重启到 Recovery', '重启到 Bootloader', '重启到 Download', '重启到 EDL']
    }
  };
})();
