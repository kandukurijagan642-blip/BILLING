(function (global) {
  function roundToTwo(num) {
    return Math.round((Number(num) || 0) * 100) / 100;
  }

  function calculateInvoiceBreakdown(items = [], sellerStateCode = '37', buyerStateCode = '37') {
    const isLocal = String(sellerStateCode) === String(buyerStateCode);
    let taxableVal = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;

    (items || []).forEach((item) => {
      const qty = parseFloat(item.quantity !== undefined ? item.quantity : item.qty) || 0;
      const rate = parseFloat(item.rate !== undefined ? item.rate : item.price) || 0;
      const discount = parseFloat(item.discount) || 0;
      const taxRate = parseFloat(item.taxRate !== undefined ? item.taxRate : (item.gst !== undefined ? item.gst : 0)) || 0;

      let lineAmount = parseFloat(item.amount);
      if (isNaN(lineAmount) || lineAmount <= 0) {
        const lineGross = roundToTwo(qty * rate);
        const discAmt = roundToTwo(lineGross * (discount / 100));
        lineAmount = roundToTwo(lineGross - discAmt);
      }
      taxableVal += lineAmount;

      if (taxRate > 0) {
        const gstAmt = roundToTwo(lineAmount * (taxRate / 100));
        if (isLocal) {
          const cgst = roundToTwo(gstAmt / 2);
          const sgst = roundToTwo(gstAmt - cgst);
          totalCgst += cgst;
          totalSgst += sgst;
        } else {
          totalIgst += gstAmt;
        }
      }
    });

    taxableVal = roundToTwo(taxableVal);
    totalCgst = roundToTwo(totalCgst);
    totalSgst = roundToTwo(totalSgst);
    totalIgst = roundToTwo(totalIgst);

    const totalTax = roundToTwo(totalCgst + totalSgst + totalIgst);
    const rawGrandTotal = roundToTwo(taxableVal + totalTax);
    const roundedGrandTotal = Math.round(rawGrandTotal);

    return {
      taxableVal,
      totalCgst,
      totalSgst,
      totalIgst,
      totalTax,
      rawGrandTotal,
      roundedGrandTotal,
      roundOff: roundToTwo(roundedGrandTotal - rawGrandTotal),
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
      balanceDue: Math.max(0, roundToTwo(grandTotal - totalPaidSum))
    };
  }

  function getNextInvoiceNumber(existingInvoices = []) {
    let maxNo = 0;

    (existingInvoices || []).forEach((inv) => {
      const rawStr = String(inv?.invoiceNo || (inv?.details && inv?.details.invoiceNo) || '').trim();
      const num = parseInt(rawStr, 10);
      if (!Number.isNaN(num) && num > maxNo) {
        maxNo = num;
      }
    });

    const nextNum = maxNo > 0 ? maxNo + 1 : 1;
    return nextNum.toString().padStart(4, '0');
  }

  global.InvoiceUtils = {
    roundToTwo,
    calculateInvoiceBreakdown,
    calculatePaymentSummary,
    getNextInvoiceNumber
  };
})(typeof window !== 'undefined' ? window : globalThis);
