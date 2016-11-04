//=============================================================================
// Tax schedule data

var tax_schedule = {
	"single": {
		"income_tax_brackets": [
			{"cap": 0, "rate": 0},
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
	
	"mfj": {
		"income_tax_brackets": [
			{"cap": 0, "rate": 0},
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
	
	"mfs": {
		"income_tax_brackets": [
			{"cap": 0, "rate": 0},
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
	
	"hoh": {
		"income_tax_brackets": [
			{"cap": 0, "rate": 0},
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


//=============================================================================
// Initialize input object

var inputs = {
	filing_status: 'single',
	earned_income: 50000,
	ltcg: 0,
	deductions: 6300,
	exemptions: 1,
	personal_exemption_value: 4050,
	get_offset: function() { return this.deductions + this.exemptions*this.personal_exemption_value },
	get_sched: function() { return tax_schedule[this.filing_status] }
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
	function Tax(gross, offset, tax_schedule) {
		this.gross = gross;
		this.offset = offset;
		this.taxable = Math.max(gross - offset, 0);
		this.schedule = tax_schedule;
		this.brackets = get_tax_brackets(this.taxable, tax_schedule);
		this.marginal = function(){ return this.brackets[this.brackets.length - 1].rate; };
		this.due = get_tax(this.taxable, tax_schedule);
		this.average = function() {
			var val = this.due / this.taxable
			return (isNaN(val) ? 0 : val);
		};
	};
	
	// Object to hold tax objects and to be returned by calculated_values()
	var calc = new Object();				
	calc.income_tax = new Tax(inputs.earned_income, inputs.get_offset(), inputs.get_sched().income_tax_brackets);
	calc.fica = new Tax(inputs.earned_income, 0, inputs.get_sched().fica_tax_brackets);
	
	// Note: presently, deductions and exemptions only offset earned income,
	//		 and do not offset ltcg in the case where deductions + exemptions > earned income.
	
	calc.ltcg_tax = new Tax(inputs.ltcg, 0, inputs.get_sched().ltcg_tax_brackets);
	calc.ltcg_tax.brackets = get_tax_brackets(calc.income_tax.taxable + calc.ltcg_tax.taxable, calc.ltcg_tax.schedule);
	calc.ltcg_tax.due = 
		get_tax(calc.income_tax.taxable + calc.ltcg_tax.taxable, calc.ltcg_tax.schedule)
		- get_tax(calc.income_tax.taxable, calc.ltcg_tax.schedule);
	calc.ltcg_tax.offset = inputs.get_offset();
	
	calc.total = new Object();
	calc.total.due = calc.income_tax.due + calc.fica.due + calc.ltcg_tax.due;
	calc.total.effective = calc.total.due / (inputs.earned_income + inputs.ltcg);
	calc.total.marginal_on_income = calc.income_tax.marginal() + calc.fica.marginal();
					
	return calc;
};

