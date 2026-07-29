(function (global) {
  function calculateInvoiceBreakdown(items = [], sellerStateCode = '37', buyerStateCode = '37') {
    const isLocal = String(sellerStateCode) === String(buyerStateCode);
    let taxableVal = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;

    (items || []).forEach((item) => {
      const amount = parseFloat(item.amount) || 0;
      const ratePct = parseFloat(item.gstRate) || 0;

      taxableVal += amount;

      if (isLocal) {
        totalCgst += amount * (ratePct / 2) / 100;
        totalSgst += amount * (ratePct / 2) / 100;
      } else {
        totalIgst += amount * ratePct / 100;
      }
    });

    const rawGrandTotal = taxableVal + totalCgst + totalSgst + totalIgst;
    const roundedGrandTotal = Math.round(rawGrandTotal);

    return {
      taxableVal,
      totalCgst,
      totalSgst,
      totalIgst,
      rawGrandTotal,
      roundedGrandTotal,
      roundOff: roundedGrandTotal - rawGrandTotal,
      isLocal
    };
  }

  function calculatePaymentSummary(grandTotal, paymentStatus, paidAmount) {
    let resolvedPaidAmount = 0;

    if (paymentStatus === 'Paid') {
      resolvedPaidAmount = grandTotal;
    } else if (paymentStatus === 'Partial') {
      resolvedPaidAmount = parseFloat(paidAmount) || 0;
    }

    return {
      paidAmount: resolvedPaidAmount,
      balanceDue: Math.max(0, grandTotal - resolvedPaidAmount)
    };
  }

  function getNextInvoiceNumber(existingInvoices = []) {
    let maxNo = 0;

    (existingInvoices || []).forEach((inv) => {
      const rawStr = String(inv?.invoiceNo || '').trim();
      const num = parseInt(rawStr, 10);
      if (!Number.isNaN(num) && num > maxNo) {
        maxNo = num;
      }
    });

    const nextNum = maxNo > 0 ? maxNo + 1 : 1;
    return nextNum.toString().padStart(4, '0');
  }

  global.InvoiceUtils = {
    calculateInvoiceBreakdown,
    calculatePaymentSummary,
    getNextInvoiceNumber
  };
})(typeof window !== 'undefined' ? window : globalThis);
