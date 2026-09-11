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

  function getNextInvoiceNumber(existingInvoices = [], options = {}) {
    const { fillGaps = true, preferInvoiceNo = null } = (typeof options === 'object' && options !== null) ? options : {};
    
    const parsedNums = [];
    const numSet = new Set();
    let detectedPrefix = '';
    let maxPadding = 4;

    (existingInvoices || []).forEach((inv) => {
      const rawStr = String(inv?.invoiceNo || (inv?.details && inv?.details.invoiceNo) || '').trim();
      if (!rawStr) return;
      
      const match = rawStr.match(/^(.*?)(\d+)$/);
      if (match) {
        const prefix = match[1];
        const num = parseInt(match[2], 10);
        const padLen = match[2].length;
        if (!Number.isNaN(num) && num > 0) {
          parsedNums.push(num);
          numSet.add(num);
          if (prefix && !detectedPrefix) detectedPrefix = prefix;
          if (padLen > maxPadding) maxPadding = padLen;
        }
      } else {
        const num = parseInt(rawStr, 10);
        if (!Number.isNaN(num) && num > 0) {
          parsedNums.push(num);
          numSet.add(num);
        }
      }
    });

    // If a preferred invoice number was suggested (e.g. specifically deleted invoice number)
    // and that number is now free, directly prioritize it!
    if (preferInvoiceNo) {
      const prefMatch = String(preferInvoiceNo).trim().match(/^(.*?)(\d+)$/);
      if (prefMatch) {
        const prefNum = parseInt(prefMatch[2], 10);
        if (!Number.isNaN(prefNum) && !numSet.has(prefNum)) {
          const prefPrefix = prefMatch[1] || detectedPrefix;
          const prefPad = Math.max(prefMatch[2].length, maxPadding);
          return prefPrefix + prefNum.toString().padStart(prefPad, '0');
        }
      }
    }

    if (parsedNums.length === 0) {
      return detectedPrefix + (1).toString().padStart(maxPadding, '0');
    }

    const sortedNums = Array.from(numSet).sort((a, b) => a - b);
    const minNum = sortedNums[0];
    const maxNum = sortedNums[sortedNums.length - 1];

    const startNum = (minNum > 50) ? minNum : 1;
    let nextNum = null;

    if (fillGaps) {
      for (let i = startNum; i <= maxNum; i++) {
        if (!numSet.has(i)) {
          nextNum = i;
          break;
        }
      }
    }

    if (nextNum === null) {
      nextNum = maxNum + 1;
    }

    return detectedPrefix + nextNum.toString().padStart(maxPadding, '0');
  }

  global.InvoiceUtils = {
    roundToTwo,
    calculateInvoiceBreakdown,
    calculatePaymentSummary,
    getNextInvoiceNumber
  };
})(typeof window !== 'undefined' ? window : globalThis);
