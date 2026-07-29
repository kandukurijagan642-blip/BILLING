(function (global) {
  function calculateInvoiceBreakdown(items = [], sellerStateCode = '37', buyerStateCode = '37') {
    const isLocal = String(sellerStateCode) === String(buyerStateCode);
    let taxableVal = 0;

    (items || []).forEach((item) => {
      const amount = parseFloat(item.amount) || 0;
      taxableVal += amount;
    });

    const rawGrandTotal = taxableVal;
    const roundedGrandTotal = Math.round(rawGrandTotal);

    return {
      taxableVal,
      totalCgst: 0,
      totalSgst: 0,
      totalIgst: 0,
      rawGrandTotal,
      roundedGrandTotal,
      roundOff: roundedGrandTotal - rawGrandTotal,
      isLocal
    };
  }

  function calculatePaymentSummary(grandTotal, paymentStatus, paidAmount, balancePaid) {
    let resolvedPaidAmount = 0;
    let resolvedBalancePaid = 0;

    if (paymentStatus === 'Paid') {
      resolvedPaidAmount = grandTotal;
    } else if (paymentStatus === 'Partial') {
      resolvedPaidAmount = parseFloat(paidAmount) || 0;
      resolvedBalancePaid = parseFloat(balancePaid) || 0;
    }

    const totalPaidSum = resolvedPaidAmount + resolvedBalancePaid;

    return {
      paidAmount: resolvedPaidAmount,
      balancePaid: resolvedBalancePaid,
      balanceDue: Math.max(0, grandTotal - totalPaidSum)
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
