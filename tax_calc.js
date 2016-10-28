//=============================================================================
// Tax schedule data

var tax_schedule = {
	"single": {
		"income_tax_brackets": [
			{"cap": 9275, "rate": 0.10},
			{"cap": 37650, "rate": 0.15},
			{"cap": 91150, "rate": 0.25},
			{"cap": 190150, "rate": 0.28},
			{"cap": 413350, "rate": 0.33}
		],
		"ltcg_tax_brackets": [
			{"cap": 37650, "rate": 0},
			{"cap": 413350, "rate": 0.15}
		],
		"fica_tax_brackets": [
			{"cap": 118500, "rate": 0.0765},
			{"cap": 1000000, "rate": 0.0145}
		]
	},
	
	"married_filing_jointly": {
		"income_tax_brackets": [
			{"cap": 18550, "rate": 0.10},
			{"cap": 75300, "rate": 0.15},
			{"cap": 151900, "rate": 0.25},
			{"cap": 231450, "rate": 0.28},
			{"cap": 413350, "rate": 0.33}
		],
		"ltcg_tax_brackets": [
			{"cap": 75300, "rate": 0},
			{"cap": 413350, "rate": 0.15}
		],
		"fica_tax_brackets": [
			{"cap": 118500, "rate": 0.0765},
			{"cap": 1000000, "rate": 0.0145}
		]
	},
	
	"married_filing_separately": {
		"income_tax_brackets": [
			{"cap": 9275, "rate": 0.10},
			{"cap": 37650, "rate": 0.15},
			{"cap": 75950, "rate": 0.25},
			{"cap": 115725, "rate": 0.28},
			{"cap": 206675, "rate": 0.33}
		],
		"ltcg_tax_brackets": [
			{"cap": 37650, "rate": 0},
			{"cap": 413350, "rate": 0.15}
		],
		"fica_tax_brackets": [
			{"cap": 118500, "rate": 0.0765},
			{"cap": 1000000, "rate": 0.0145}
		]
	},
	
	"head_of_household": {
		"income_tax_brackets": [
			{"cap": 13250, "rate": 0.10},
			{"cap": 50400, "rate": 0.15},
			{"cap": 130150, "rate": 0.25},
			{"cap": 210800, "rate": 0.28},
			{"cap": 413350, "rate": 0.33}
		],
		"ltcg_tax_brackets": [
			{"cap": 50400, "rate": 0},
			{"cap": 413350, "rate": 0.15}
		],
		"fica_tax_brackets": [
			{"cap": 118500, "rate": 0.0765},
			{"cap": 1000000, "rate": 0.0145}
		]
	}
};

//==============================================================================
// Utility functions to calculate taxes

function add(a, b) {
	return a + b;
};


function get_tax_brackets(taxable_income, schedule) {
	var n_brackets = schedule
					.map(function(x) { return (taxable_income > x.cap) } )
					.reduce(add, 0);
	return schedule.slice(0, n_brackets + 1);
};

function get_tax(taxable_income, brackets) {
	var my_b = get_tax_brackets(taxable_income, brackets);
	var n = my_b.length;
	var tax = 0;
	
	if (n == 1) {
		// if only one bracket applies
		tax += taxable_income * my_b[0].rate;
	} else {
		// marginal bracket
		tax += (taxable_income - my_b[n - 2].cap) * my_b[n - 1].rate;
		// bottom bracket
		tax += my_b[0].cap * my_b[0].rate;
		if (n >= 3) {
			// all brackets between bottom and marginal
			for (i = n - 2; i > 0; i--) {
				tax += (my_b[i].cap - my_b[i - 1].cap) * my_b[i].rate;
			} 
		}
	}
	return tax;
};

//==============================================================================
// Function to generate calculated values
function calculate(inputs) {

	// constructor for tax object
	function Tax(taxable_amount, tax_schedule) {
		this.taxable = taxable_amount;
		this.schedule = tax_schedule;
		this.brackets = get_tax_brackets(this.taxable, this.schedule);
		this.marginal = this.brackets[this.brackets.length - 1].rate;
		this.due = get_tax(this.taxable, this.schedule);
		this.average = function() {
			var val = this.due() / this.taxable
			return (isNaN(val) ? 0 : val);
		};
	}
	
	// Object to hold tax objects and to be returned by calculated_values()
	var calc = new Object();				
	calc.income_tax = new Tax(inputs.get_taxable_income(), inputs.reg.income_tax_brackets);
	calc.fica = new Tax(inputs.earned_income, inputs.reg.fica_tax_brackets);
	
	// Note: presently, deductions and exemptions only offset earned income,
	//		 and do not offset ltcg in the case where deductions + exemptions > earned income.
	calc.ltcg = new Tax(inputs.ltcg, inputs.reg.ltcg_tax_brackets);
	calc.ltcg.marginal = function() {
		var brackets = get_tax_brackets(
			calc.income_tax.taxable + calc.ltcg.taxable, calc.ltcg.schedule
		);
		return brackets[brackets.length - 1].rate;
	};
	calc.ltcg.due = 
		get_tax(calc.income_tax.taxable + calc.ltcg.taxable, calc.ltcg.schedule)
		- get_tax(calc.income_tax.taxable, calc.ltcg.schedule);
	
	calc.total = new Object();
	calc.total.due = calc.income_tax.due + calc.fica.due + calc.ltcg.due;
	calc.total.effective = calc.total.due / (inputs.earned_income + inputs.ltcg);
	calc.total.marginal_on_income = calc.income_tax.marginal + calc.fica.marginal;
					
	return calc;
};