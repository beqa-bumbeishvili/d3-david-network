function Chart() {
	// Exposed variables
	var attrs = {
		id: 'ID' + Math.floor(Math.random() * 1000000), // Id for event handlings
		svgWidth: 400,
		svgHeight: 400,
		marginTop: 35,
		marginBottom: 5,
		marginRight: 5,
		marginLeft: 50,
		container: 'body',
		defaultTextFill: '#2C3E50',
		defaultFont: 'Helvetica',
		container: '#network-graph-container',
		nodeSize: { min: 3, max: 8 },
		domainObject: {},
		colorPalette: ['#2965CC', '#29A634', '#D99E0B', '#D13913', '#8F398F', '#00B3A4', '#DB2C6F', '#9BBF30', '#96622D', '#7157D9'],
		lineWidth: { primary: 0.5, secondary: 0.1 },
		rawData: null
	};

	//InnerFunctions which will update visuals
	var updateData;

	//Main chart object
	var main = function () {
		//Drawing containers
		var container = d3.select(attrs.container);

		//Calculated properties
		var calc = {};
		calc.id = 'ID' + Math.floor(Math.random() * 1000000); // id for event handlings
		calc.chartLeftMargin = attrs.marginLeft;
		calc.chartTopMargin = attrs.marginTop;
		calc.chartWidth = attrs.svgWidth - attrs.marginRight - calc.chartLeftMargin;
		calc.chartHeight = attrs.svgHeight - attrs.marginBottom - calc.chartTopMargin;

		let graphData = generateGraphData(attrs.rawData);

		let canvas = container.select("canvas").node();

		let context = canvas.getContext("2d"),
			width = canvas.width,
			height = canvas.height;

		let nodeRadius = 5;

		let chosenNodeSizeOption = d3.select('#select-by-node-size').node().value;
		let nodeSizeDomainNumbers = getNodeSizeScaleDomain(graphData, chosenNodeSizeOption);

		let nodeRadiusScale = d3.scaleLinear()
			.domain(d3.extent(nodeSizeDomainNumbers))
			.range([attrs.nodeSize.min, attrs.nodeSize.max]);

		const colorsObject = generateColorsObject();

		let simulation = d3.forceSimulation()
			.force("center", d3.forceCenter(width / 2, height / 2))
			.force("charge", d3.forceManyBody())
			.force("link", d3.forceLink().id(d => d.id));

		let transform = d3.zoomIdentity;

		// The simulation will alter the input data objects so make
		// copies to protect the originals.
		const nodes = graphData.nodes.map(d => Object.assign({}, d));
		const edges = graphData.links.map(d => Object.assign({}, d));

		d3.select(canvas)
			.call(d3.zoom()
				.scaleExtent([1 / 10, 8])
				.on('zoom', zoomed));

		simulation.nodes(nodes)
			.on("tick", simulationUpdate);

		simulation.force("link")
			.links(edges);

		eventListeners();

		// FUNCTIONS

		function zoomed(e) {
			transform = e.transform;
			simulationUpdate();
		}

		function simulationUpdate() {
			context.save();
			context.clearRect(0, 0, width, height);
			context.translate(transform.x, transform.y);
			context.scale(transform.k, transform.k);

			// Draw edges
			edges.forEach(function (d) {
				context.beginPath();
				context.moveTo(d.source.x, d.source.y);
				context.lineTo(d.target.x, d.target.y);
				context.lineWidth = d.primary ? attrs.lineWidth.primary : attrs.lineWidth.secondary;
				context.strokeStyle = d.source.nodeRadius > d.target.nodeRadius ? d.source.nodeColor : d.target.nodeColor;
				context.strokeStyle = '#aaa';

				context.stroke();
			});

			// Draw nodes
			nodes.forEach(function (d, i) {
				context.beginPath();

				if (['Research Method Population Scale', 'Harm Magnitude', 'Harm Population Impact'].includes(chosenNodeSizeOption)) {
					d.nodeRadius = nodeRadiusScale(attrs.domainObject[d[chosenNodeSizeOption]]);
				}
				else {
					d.nodeRadius = nodeRadiusScale(+d[chosenNodeSizeOption]);
				}

				context.moveTo(d.x + d.nodeRadius, d.y);
				context.arc(d.x, d.y, d.nodeRadius, 0, 2 * Math.PI);

				d.nodeColor = colorsObject[d['Social Determinant Category']];

				context.fillStyle = d.nodeColor;
				context.fill();

				context.strokeStyle = "#fff";
				context.lineWidth = 1;
				context.stroke();
			});

			context.restore();
		}

		function eventListeners() {
			nodeSizeListener();
			secondaryLinksListener();
		}

		function generateColorsObject() {
			let colorsObject = {};
			let uniqCategories = Array.from(new Set(graphData.nodes.map(d => d['Social Determinant Category'])));

			uniqCategories.forEach(function (category, index) {
				colorsObject[category] = attrs.colorPalette[index % attrs.colorPalette.length];
			});

			return colorsObject;
		}

		function nodeSizeListener() {
			d3.select('#select-by-node-size').on('change', function () {
				main();
			});
		}

		function secondaryLinksListener() {
			d3.select('#select-by-secondary-links').on('change', function () {
				main();
			});
		}

		function getNodeSizeScaleDomain(graphData, chosenNodeSizeOption) {
			let domain = [];
			let domainAttributesFromData;

			if (chosenNodeSizeOption === 'Research Method Population Scale') {
				domainAttributesFromData = ['Very Small', 'Small', 'Medium', 'Large', 'Very Large'];
				domain = mapAttributesToNumbers(domainAttributesFromData, false);

				domainAttributesFromData.forEach((key, i) => attrs.domainObject[key] = i);

			}
			else if (chosenNodeSizeOption === 'Harm Magnitude' || chosenNodeSizeOption === 'Harm Population Impact') {
				let correctOrder = ['Lower Harm', 'Medium Harm', 'High Harm'];
				let harmColumn = graphData.nodes.map(d => d[chosenNodeSizeOption]);
				domainAttributesFromData = customSortHarmNodes(harmColumn, correctOrder)

				domain = mapAttributesToNumbers(domainAttributesFromData, false);

				let uniqDomainAttributes = Array.from(new Set(domainAttributesFromData));
				uniqDomainAttributes.forEach((key, i) => attrs.domainObject[key] = i);
			}
			else {
				let stringAttributes = graphData.nodes
					.map(d => removeCommas(d[chosenNodeSizeOption]))

				stringAttributes.sort((a, b) => +a - +b);

				domain = mapAttributesToNumbers(stringAttributes, true);
			}

			return domain;
		}

		function removeCommas(num) {
			if (typeof num !== 'string')
				return num;

			return num.replace(/\,/g, '');
		};

		function mapAttributesToNumbers(attributes, numeralAttributes) {
			if (numeralAttributes) return attributes.map(num => +num);

			let uniqAttributes = Array.from(new Set(attributes));
			let domain = uniqAttributes.map((_d, i) => i);

			return domain;
		}

		function customSortHarmNodes(array, order) {
			return array.sort(function (a, b) {
				let harmLevelA = getFirstTwoWords(a);
				let harmLevelB = getFirstTwoWords(b);

				return order.indexOf(harmLevelA) - order.indexOf(harmLevelB);
			});
		}

		function getFirstTwoWords(str) {
			const words = str.split(' ');

			return words.slice(0, 2).join(' ');
		}

		function generateGraphData(rawData) {
			let nodes = rawData.map(d => d);

			let links = generateLinksData(nodes);

			return {
				nodes: nodes,
				links: links
			};
		}

		function generateLinksData(nodes) {
			let chosenSecondaryLinksOption = d3.select('#select-by-secondary-links').node().value;

			const groupByPrimaryDeterminantAnalyzed = d3.group(nodes.filter(d => d['Primary Determinant Analyzed']), d => d['Primary Determinant Analyzed']);
			const groupBySecondaryDeterminantAnalyzed = d3.group(nodes.filter(d => d[chosenSecondaryLinksOption]), d => d[chosenSecondaryLinksOption]);

			const groupedObjectPrimary = Object.fromEntries(groupByPrimaryDeterminantAnalyzed);
			const groupedObjectAnalyzed = Object.fromEntries(groupBySecondaryDeterminantAnalyzed);

			let linksTotal = [];

			nodes.forEach(function (nodeData) {
				let primaryLinksForGivenNode = [];
				let analyzedRelevantLinks = [];
				nodeData.id = nodeData.ID;

				if (nodeData['Primary Determinant Analyzed']) {
					primaryLinksForGivenNode = groupedObjectPrimary[nodeData['Primary Determinant Analyzed']]
						.map(function (d) {
							return { source: nodeData.ID, target: d.ID, primary: true }
						});
				}

				if (nodeData[chosenSecondaryLinksOption]) {
					analyzedRelevantLinks = groupedObjectAnalyzed[nodeData[chosenSecondaryLinksOption]]
						.map(function (d) {
							return { source: nodeData.ID, target: d.ID, primary: false }
						});
				}

				linksTotal.push(primaryLinksForGivenNode);
				linksTotal.push(analyzedRelevantLinks);
			});

			let flatLinks = linksTotal.flat();

			let cleanedLinks = cleanLinks(flatLinks);

			return cleanedLinks;
		}

		function cleanLinks(links) {
			const seen = new Set();

			return links.filter(link => {
				const sortedPair = [link.source, link.target].sort().join('-');

				if (link.source === link.target || seen.has(sortedPair)) {
					return false;
				}

				seen.add(sortedPair);

				return true;
			});
		}

		// Smoothly handle data updating
		updateData = function () { };

		//#########################################  UTIL FUNCS ##################################

	};

	//----------- PROTOTYPE FUNCTIONS  ----------------------
	d3.selection.prototype.patternify = function (params) {
		var container = this;
		var selector = params.selector;
		var elementTag = params.tag;
		var data = params.data || [selector];

		// Pattern in action
		var selection = container.selectAll('.' + selector).data(data, (d, i) => {
			if (typeof d === 'object') {
				if (d.id) {
					return d.id;
				}
			}
			return i;
		});
		selection.exit().remove();
		selection = selection.enter().append(elementTag).merge(selection);
		selection.attr('class', selector);
		return selection;
	};

	//Dynamic keys functions
	Object.keys(attrs).forEach((key) => {
		// Attach variables to main function
		return (main[key] = function (_) {
			var string = `attrs['${key}'] = _`;
			if (!arguments.length) {
				return eval(` attrs['${key}'];`);
			}
			eval(string);
			return main;
		});
	});

	// Run  visual
	main.render = function () {
		main();

		return main;
	};

	return main;
}
