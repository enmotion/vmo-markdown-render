/** 五种标准 Alerts 映射与本库别名共用一张表，样式不重复推断语义。 */
export const alerts: Record<string, { color: string; label: string; icon: string }> = {
  IMPORTANT: { color: 'primary', label: '重要', icon: 'M12 2 22 12 12 22 2 12Z M12 7v6 M12 16v.1' },
  NOTE: { color: 'info', label: '说明', icon: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20 M12 11v6 M12 7v.1' },
  TIP: { color: 'success', label: '提示', icon: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20 M7 12l3 3 7-7' },
  WARNING: { color: 'warning', label: '警告', icon: 'M12 3 2 21h20Z M12 9v5 M12 17v.1' },
  CAUTION: { color: 'danger', label: '危险', icon: 'M8 2h8l6 6v8l-6 6H8l-6-6V8Z M12 7v6 M12 16v.1' },
};
alerts.INFO = alerts.NOTE;
alerts.SUCCESS = { ...alerts.TIP, label: '成功' };
alerts.DANGER = alerts.CAUTION;
alerts.ERROR = { ...alerts.CAUTION, label: '错误' };
