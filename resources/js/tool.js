$.extend({
	// 计算pmt的月供
	calcPmt: (param) => {
		var ir = parseFloat(param.rate) / 1200;
		var np = parseInt(param.term);
		var pv = parseFloat(param.totalAmt);
		var fv = parseFloat(param.finalAmt);
		return PMT(ir, np, -pv, fv).toFixed(2);
	},
	// 计算rate的利率(月利率)
	calcMonthRate: param => {
		var np = parseInt(param.term);
		var pv = parseFloat(param.totalAmt);
		var fv = parseFloat(param.finalAmt);
		var pmt = parseFloat(param.monthAmt);
		return RATE(np, pmt, -pv, fv).toFixed(4) * 100;
	},
	// 年利率
	calcRate: param => {
		this.calcMonthRate(param) * 12;
	},
	/*加减乘除*/
	add: (x, y)=>Decimal.add(x,y).toNumber(),
	sub: (x, y)=>Decimal.sub(x,y).toNumber(),
	mul: (x, y)=>Decimal.mul(x,y).toNumber(),
	div: (x, y)=>Decimal.div(x,y).toNumber(),
	// 四舍五入
	round: (num, digits=2)=>new Decimal(new Decimal(num).toFixed(digits, Decimal.ROUND_HALF_UP))
		.toNumber()
})

function PMT(ir, np, pv, fv, type) {
	/*
	 * ir   - interest rate per month
	 * np   - number of periods (months)
	 * pv   - present value
	 * fv   - future value
	 * type - when the payments are due:
	 *        0: end of the period, e.g. end of month (default)
	 *        1: beginning of period
	 */
	var pmt, pvif;

	fv || (fv = 0);
	type || (type = 0);

	if (ir === 0)
		return -(pv + fv) / np;

	pvif = Math.pow(1 + ir, np);
	pmt = -ir * (pv * pvif + fv) / (pvif - 1);

	if (type === 1)
		pmt /= (1 + ir);

	return pmt;
}

// rate函数
function RATE(nper, pmt, pv, fv, type, guess) {
	if (guess == null) guess = 0.01;
	if (fv == null) fv = 0;
	if (type == null) type = 0;

	var FINANCIAL_MAX_ITERATIONS = 128; //Bet accuracy with 128
	var FINANCIAL_PRECISION = 0.0000001; //1.0e-8

	var y, y0, y1, x0, x1 = 0,
		f = 0,
		i = 0;
	var rate = guess;
	if (Math.abs(rate) < FINANCIAL_PRECISION) {
		y = pv * (1 + nper * rate) + pmt * (1 + rate * type) * nper + fv;
	} else {
		f = Math.exp(nper * Math.log(1 + rate));
		y = pv * f + pmt * (1 / rate + type) * (f - 1) + fv;
	}
	y0 = pv + pmt * nper + fv;
	y1 = pv * f + pmt * (1 / rate + type) * (f - 1) + fv;

	// find root by Newton secant method
	i = x0 = 0.0;
	x1 = rate;
	while ((Math.abs(y0 - y1) > FINANCIAL_PRECISION) && (i < FINANCIAL_MAX_ITERATIONS)) {
		rate = (y1 * x0 - y0 * x1) / (y1 - y0);
		x0 = x1;
		x1 = rate;

		if (Math.abs(rate) < FINANCIAL_PRECISION) {
			y = pv * (1 + nper * rate) + pmt * (1 + rate * type) * nper + fv;
		} else {
			f = Math.exp(nper * Math.log(1 + rate));
			y = pv * f + pmt * (1 / rate + type) * (f - 1) + fv;
		}

		y0 = y1;
		y1 = y;
		++i;
	}
	return rate;
}
