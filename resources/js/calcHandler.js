var CalcHandler = {
	// 计算还款计划表
	calcRepayPlans: ()=>{
		$('#submit').click(() => {
			var dataObj = {};
			$.each($("#ff").serializeArray(), function(i, field) {
				dataObj[field.name] = field.value;
			});
			var plans = [];
			switch(dataObj.repayMethod) {
				case 'debx': plans = CalcHandler.calcDebxRepayPlan(dataObj); break; // 等额本息
				case 'debj': plans = CalcHandler.calcDebjRepayPlan(dataObj); break; // 等额本金
				case 'dbdx': plans = CalcHandler.calcDbdxRepayPlan(dataObj); break; // 等本等息
				case 'xxhb': plans = CalcHandler.calcXxhbRepayPlan(dataObj); break; // 先息后本
				default: break;
			}
			var totalItem = {};
			var totalMonth = totalPrincipal = totalPaidAmt = 0;
			$.each(plans, (i, item)=>{
				totalMonth = $.add(totalMonth, item.monthAmt);
				totalPrincipal = $.add(totalPrincipal, item.principalAmt);
				totalPaidAmt = $.add(totalPaidAmt, item.paidAmt);
			})
			plans.push({term: '总计', monthAmt: totalMonth, principalAmt: totalPrincipal, paidAmt: totalPaidAmt, beginAmt: '-'});
			
			$('#planTable').datagrid({
			 	title: '还款计划表',
			 	width: 450,
			 	height: 'auto',
			 	fitColumns: true,
			 	columns: [
			 		[{
			 			field: 'term', 
			 			width: '50',
			 			title: '期数',
						align: 'center'
			 		}, {
			 			field: 'monthAmt',
			 			title: '月供(￥)',
			 			width: '100',
			 			align: 'center'
			 		}, {
			 			field: 'principalAmt',
			 			title: '本金(￥)',
			 			width: '100',
			 			align: 'center',
			 		}, {
			 			field: 'paidAmt',
			 			title: '利息(￥)',
			 			width: '100',
			 			align: 'center',
			 		}, {
			 			field: 'beginAmt',
			 			title: '期初本金(￥)',
			 			width: '100',
			 			align: 'center',
			 		}]
			 	]
			 });
			
			$('#planTable').datagrid('loadData', plans);
			$(".panel-htop").css({
				float:'left', margin: '0 20px 10px 0'
			})
		})
	},
	/**
	 * 计算等额本息还款计划表
	 * 
	 * @param {*} dataObj 
	 * totalAmt 贷款总额
	 * finalAmt 尾付
	 * term 期限
	 * rate 年利率（单位%）
	 */
	calcDebxRepayPlan: (dataObj)=>{
		var plans = [];
		// 使用pmt计算月供
		var monthAmt = parseFloat($.calcPmt(dataObj));
		// 总期数
		var term = parseInt(dataObj.term);
		// 月利率
		var rate = parseFloat(dataObj.rate) / 1200
		// 每一期还款计划表项
		var planItem = {
			beginAmt: parseFloat(dataObj.totalAmt), //期初本金
			monthAmt: monthAmt, // 每期月供
			principalAmt: 0.0, //每期本金
			paidAmt: 0.0 //每期利息
		};
		
		for (var i = 1; i < term; i++) {
			// 期数
			planItem.term = i;
			// 期初本金
			planItem.beginAmt = $.sub(planItem.beginAmt, planItem.principalAmt);
			// 利息=期初本金*月利率
			planItem.paidAmt = $.round($.mul(planItem.beginAmt, rate));
			// 本金=月供-利息
			planItem.principalAmt = $.sub(planItem.monthAmt, planItem.paidAmt);
			plans.push($.extend({}, planItem));
		}
		// 最后一期，平尾差
		planItem.beginAmt = $.sub(planItem.beginAmt, planItem.principalAmt);
		planItem.principalAmt = planItem.beginAmt;
		planItem.paidAmt = $.round($.mul(planItem.beginAmt, rate));
		planItem.monthAmt = $.add(planItem.principalAmt, planItem.paidAmt);
		planItem.term = term;
		plans.push(planItem);
		return plans;
	},
	/**
	 * 计算等额本金：每期本金都相同
	 */
	calcDebjRepayPlan: (dataObj) => {
		var plans = [];
		
		var term = parseInt(dataObj.term); // 总期数
		var totalAmt = parseFloat(dataObj.totalAmt); //总金额
		var principalAmt = $.round($.div(totalAmt, term)); // 每期本金
		// 月利率
		var rate = parseFloat(dataObj.rate) / 1200
		// 每一期还款计划表项
		var planItem = {
			beginAmt: totalAmt, //期初本金
			monthAmt: 0.0, // 每期月供
			principalAmt: 0.0, //每期本金
			paidAmt: 0.0 //每期利息
		};
		for (var i = 1; i < term; i++) {
			// 期数
			planItem.term = i;
			// 期初本金
			planItem.beginAmt = $.sub(planItem.beginAmt, planItem.principalAmt);
			// 利息=期初本金*月利率
			planItem.paidAmt = $.round($.mul(planItem.beginAmt, rate));
			planItem.principalAmt = principalAmt;
			// 月供=本金+利息
			planItem.monthAmt = $.add(planItem.principalAmt, planItem.paidAmt);
			plans.push($.extend({}, planItem));
		}
		// 最后一期，平尾差
		planItem.beginAmt = $.sub(planItem.beginAmt, planItem.principalAmt);
		planItem.principalAmt = planItem.beginAmt;
		planItem.paidAmt = $.round($.mul(planItem.beginAmt, rate));
		planItem.monthAmt = $.add(planItem.principalAmt, planItem.paidAmt);
		planItem.term = term;
		plans.push(planItem);
		return plans;
	},
	/**
	 * 等本等息：每期本金和利息都相同
	 */
	calcDbdxRepayPlan: (dataObj) => {
		var plans = [];
		var term = parseInt(dataObj.term); // 总期数
		var totalAmt = parseFloat(dataObj.totalAmt); //总金额
		var principalAmt = $.round($.div(totalAmt, term)); // 每期本金
		var rate = parseFloat(dataObj.rate) / 1200; // 月利率
		var paidAmt = $.round($.mul(totalAmt, rate)); // 利息=总金额*月利率
		
		// 每一期还款计划表项
		var planItem = {
			beginAmt: totalAmt, //期初本金
			monthAmt: $.add(principalAmt, paidAmt), // 每期月供
			principalAmt: 0.0, //每期本金
			paidAmt: paidAmt //每期利息
		};
		for (var i = 1; i < term; i++) {
			// 期数
			planItem.term = i;
			// 期初本金
			planItem.beginAmt = $.sub(planItem.beginAmt, planItem.principalAmt);
			planItem.principalAmt = principalAmt;
			plans.push($.extend({}, planItem));
		}
		// 最后一期，平尾差
		planItem.beginAmt = $.sub(planItem.beginAmt, planItem.principalAmt);
		planItem.principalAmt = planItem.beginAmt;
		planItem.monthAmt = $.add(planItem.principalAmt, planItem.paidAmt);
		planItem.term = term;
		plans.push(planItem);
		return plans;
	},
	/**
	 * 先息后本：最后一期还本付息
	 */
	calcXxhbRepayPlan: (dataObj) => {
		var plans = [];
		var term = parseInt(dataObj.term); // 总期数
		var totalAmt = parseFloat(dataObj.totalAmt); //总金额
		var principalAmt = $.round($.div(totalAmt, term)); // 每期本金
		var rate = parseFloat(dataObj.rate) / 1200; // 月利率
		var paidAmt = $.round($.mul(totalAmt, rate)); // 利息=总金额*月利率
		
		// 每一期还款计划表项
		var planItem = {
			beginAmt: totalAmt, //期初本金
			monthAmt: paidAmt, // 每期月供
			principalAmt: 0.0, //每期本金
			paidAmt: paidAmt //每期利息
		};
		for (var i = 1; i < term; i++) {
			// 期数
			planItem.term = i;
			plans.push($.extend({}, planItem));
		}
		// 最后一期，平尾差
		planItem.principalAmt = planItem.beginAmt;
		planItem.monthAmt = $.add(planItem.principalAmt, planItem.paidAmt);
		planItem.term = term;
		plans.push(planItem);
		return plans;
	}
}
