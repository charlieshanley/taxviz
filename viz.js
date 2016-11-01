//Charlie Hanley, October 2016


//==============================================================================
// Initial variables
var width = 600;
var height = 600;
var bar_height = 480;
var y_padding = 80;
var line_width = 5;
var orig_opacity = 0.05, highlight_opacity = 0.2;


// Make initial calculated values
var calc = calculate(inputs);



//==============================================================================
// Manipulation of the DOM should occur after the document is loaded
$(document).ready( function() {
	
	
	//==============================================================================
	// Initialize viz things
	var svg = d3.select("#viz")
				.append("svg")
				.attr("width", width)
				.attr("height", height);
						
	// Generate scale            
	var barScale = d3.scaleLinear()
					.domain([0, (inputs.earned_income + inputs.ltcg) * 1.1])
					.range([bar_height, 0]);
	var yAxis = d3.axisLeft(barScale).ticks(5);
	
	// Generate axis and call it on axis group			       
	svg.append("g")
	.attr("class", "yaxis")
	.attr("transform", "translate("+y_padding+",0)")
	.call(yAxis);
	
	// transition settings to use for multiple objects
	var t = function(transition) {
		transition.duration(1200).ease(d3.easeCubicInOut);
	}
	
	//==============================================================================
	// Buttons to display calculated values
	
	// Text for three tax types buttons
	var tax_types = {
		income_tax: {disp: "Income tax", y: 0, inc_bar: "#earned_income_bar"},
		fica: {disp: "FICA tax", y: 50, inc_bar: "#earned_income_bar"},
		ltcg: {disp: "LTCG tax", y: 100, inc_bar: "#ltcg_bar"},
	}
	
	var result_text = d3.select("#text_io")
		.append("div").attr("id", "results")
		.append("svg").attr("width", 380).attr("height", 300);
		
	var button_width = 110;
	var button_height = 30;
	var button_xoffset = 85;
	var button_yoffset = 30;
		
	var buttons = result_text.selectAll("g")
		.data(Object.keys(tax_types))
		.enter().append("g")
		.attr("class", "tax_types");
		
	// Text for buttons
	buttons.append("text")
		.attrs({
			x: button_xoffset,
			y: function(d) { return tax_types[d].y + button_yoffset },
			"text-anchor": "middle"
		})
		.text( function(d) { return tax_types[d].disp });
	
	// Rectangle for buttons with mouseover features
	buttons.append("rect")
			.attrs({
				width: button_width,
				height: button_height,
				x: button_xoffset - button_width/2,
				y: function(d) { return tax_types[d].y + button_yoffset - button_height/2 - 5  },
				rx: 15,
				ry: 15,
				fill: "transparent",
				stroke: "grey"
			})	
	// Mouseover feature
		.on("mouseover", function(d) {
			// highlight button
			d3.select(this)
				//.transition()
				.attr("stroke", "black");
			// generate text results
			gen_spec_results(d);
			// highlight vis elements
			mouse_on(d);
		})
		.on("mouseout", function(d) {
			// stop highlighting button
			d3.select(this)
				.transition()
				.attr("stroke", "grey");
			// remove text results
			d3.selectAll(".result_numbers").text("");
			// stop highlighting vis elements
			mouse_off(d);
		});
		
		
	// Functions for mouseovers
	var mouse_on = function(d) {
		d3.select(tax_types[d].inc_bar)
			//.transition()
			.attr("fill-opacity", highlight_opacity);
	}
	var mouse_off = function(d) {
		d3.select(tax_types[d].inc_bar)
			//.transition().duration(100)
			.attr("fill-opacity", orig_opacity)
	}
	
	
	//==============================================================================
	// Set up display of tax-specific results
	
	
	var spec_result_labels = [
		{disp: "Marginal", y: 0},
		{disp: "Average", y: 50},
		{disp: "Due", y: 100}
	];
	
	var spec_results = result_text.append("g")
		.attr("class", "results")
		.selectAll("text")
		.data(spec_result_labels);
	
	var spec_result_x = button_xoffset + button_width/2 + 120;
		
	// Text for labels
	spec_results.enter().append("text")
		.attrs({
			x: spec_result_x - 10,
			y: function(d) { return d.y + button_yoffset },
			"text-anchor": "end"
		})
		.text( function(d) { return d.disp + ":" });
		
	// Text for numbers
	spec_results.enter().append("text")
		.attrs({
			x: spec_result_x + 10,
			y: function(d) { return d.y + button_yoffset },
			"id": function(d) { return d.disp },
			"class": "result_numbers"
		})
		.text("");
		
	// Function to re/generate display of tax-specific results
	var gen_spec_results = function(tax) {
		d3.select("#Marginal")
			.text( (calc[tax].marginal() * 100).toFixed(2) + "%" );
		d3.select("#Average")
			.text( (calc[tax].average() * 100).toFixed(2) + "%" );
		d3.select("#Due")
			.text( "$" + calc[tax].due.toFixed(2) );
	}
	
	//==============================================================================
	// Set up display of overall results
	
	var overall_result_labels = [
		{y: 110, cl: "marginal_on_income"},
		{y: 140, cl: "effective"},
		{y: 170, cl: "due"}
	];
	
	var overall_results = result_text.append("g")
		.selectAll("text")
		.data(overall_result_labels)
		.enter().append("text")
		.attrs({
			x: 250,
			y: function(d) { return d.y + 100 },
			"class": "results",
			"text-anchor": "end",
			"id": function(d) { return d.cl }
		});
	
	// Function to re/generate display of overall results
	var gen_overall_results = function(calc) {
		d3.select("#marginal_on_income")
			.text("Marginal tax on income: " + (calc.total.marginal_on_income*100).toFixed(2) + "%" );
		d3.select("#effective")
			.text("Effective tax rate: " + (calc.total.effective*100).toFixed(2) + "%" );
		d3.select("#due")
			.text("Total tax liability: $" + (calc.total.due).toFixed(2) );
	}
	
	gen_overall_results(calc);
	
	
	
	//==============================================================================
	// Bars to visualize income and taxes
	
	// Make earned income and ltcg bars
	var income_bar_dat = [
		{key: "earned_income", color: "green", offset: function() { return 0 } },
		{key:"ltcg", color: "lightseagreen", offset: function() { return inputs.earned_income } }
	];
	
	var income_bars = svg.append("g")
		.attr("id", "income_bars")
		.selectAll("rect")
		.data(income_bar_dat);
		
	var original = income_bars
		.enter().append("rect")
		.attrs({
			"id": function(d) { return d.key + "_bar" },
			x: 100,
			width: 20,
			stroke: function(d) { return d.color },
			fill: function(d) { return d.color },
			"fill-opacity": orig_opacity
		})
	
	// Make tax bars
	var make_tax_bars = function(tax, xpos) {
		var brackets = get_tax_brackets(tax.taxable, tax.schedule);
		
	}
	
	// function to regenerate income bars and tax bars
	var regen_bars = function() {
		income_bars
			.merge(original)
			.transition().call(t)
			.attrs({
				y: function(d) { return barScale( inputs[d.key] + d.offset() ) },
				height: function(d) { return (barScale(0) - barScale( inputs[d.key] )) }
			});
	}
	regen_bars();
	

	
	//==============================================================================
	// Function to regenerate after  values change.
	function update(inputs) {
		// Recalculate calculated values
		calc = calculate(inputs);
		// Regenerate overall result text
		gen_overall_results(calc);	
		// Update dollar to pixel scale, then update axis
		barScale.domain([0, (inputs.earned_income + inputs.ltcg) * 1.05]);	
		svg.select(".yaxis").transition().call(t).call(yAxis);
		// Regenerate bars
		regen_bars();
	}
	
	//=================================================================			
	// When 'submit' button is pressed, update variables and regenerate
	
	function valid_inputs(inp){
		if (inp.deductions >= 6300 && inp.deductions <= 200000 &&
			inp.earned_income >= 20000 && inp.earned_income <= 200000 &&
			inp.ltcg >= 0 && inp.ltcg <= 200000 &&
			inp.exemptions >= 0 && inp.exemptions <= 10) {
			return true;
		} else {
			return false;
		}
	}
	
	function reassign_inputs(){
		inputs['filing_status'] = $('#filing_status').val();
		var input_names = ['earned_income', 'ltcg', 'deductions', 'exemptions']
		for (n = 0; n < 4; n++) {
			inputs[input_names[n]] = parseFloat($('#' + input_names[n]).val());
		}
	}
	
	$('#submit').button();
	$('#invalid_input').popup( {opacity: 0.3, transition: 'all 0.3s'});

	$('#submit').click( function() {
		reassign_inputs();
		if (valid_inputs(inputs)) {
			update(inputs);
		} else {
			$('#invalid_input').popup('show');
		}
	});
/*
	d3.select("#earned_income").on("input", function() {
		inputs.earned_income = +this.value;
		update(inputs);
		});
	d3.select("#ltcg").on("input", function() {
		inputs.ltcg = +this.value;
		update(inputs);
		});
	d3.select("#exemptions").on("input", function() {
		inputs.exemptions = +this.value;
		update(inputs);
		});
	d3.select("#deductions").on("input", function() {
		inputs.deductions = +this.value;
		update(inputs);
		});
*/
});

