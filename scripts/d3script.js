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

		// let graphData = generateGraphData(attrs.rawData);

		let canvas = container.select("canvas").node();

		let context = canvas.getContext("2d"),
			width = canvas.width,
			height = canvas.height;

		const w2 = width / 2,
			h2 = height / 2,
			nodeRadius = 5;

		const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

		let simulation = d3.forceSimulation()
			.force("center", d3.forceCenter(width / 2, height / 2))
			.force("charge", d3.forceManyBody())
			.force("link", d3.forceLink().id(d => d.id));

		let transform = d3.zoomIdentity;

		// The simulation will alter the input data objects so make
		// copies to protect the originals.
		const nodes = attrs.rawData.nodes.map(d => Object.assign({}, d));
		const edges = attrs.rawData.links.map(d => Object.assign({}, d));

		d3.select(canvas)
			.call(d3.drag()
				.container(canvas)
				.subject(dragSubject)
				.on('start', dragStarted)
				.on('drag', dragged)
				.on('end', dragEnded))
			.call(d3.zoom()
				.scaleExtent([1 / 10, 8])
				.on('zoom', zoomed));

		simulation.nodes(nodes)
			.on("tick", simulationUpdate);

		simulation.force("link")
			.links(edges);

		function zoomed(e) {
			transform = e.transform;
			simulationUpdate();
		}

		function dragSubject(e) {
			const x = transform.invertX(e.x),
				y = transform.invertY(e.y);

			const node = findNode(nodes, x, y, nodeRadius);

			if (node) {
				node.x = transform.applyX(node.x);
				node.y = transform.applyY(node.y);
			}

			return node;
		}

		function findNode(nodes, x, y, radius) {
			const rSq = radius * radius;
			let i;

			for (i = nodes.length - 1; i >= 0; --i) {
				const node = nodes[i],
					dx = x - node.x,
					dy = y - node.y,
					distSq = (dx * dx) + (dy * dy);
				if (distSq < rSq) {
					return node;
				}
			}

			return undefined;
		}

		function dragStarted() {
			if (!d3.event.active) {
				simulation.alphaTarget(0.3).restart();
			}
			d3.event.subject.fx = transform.invertX(d3.event.x);
			d3.event.subject.fy = transform.invertY(d3.event.y);
		}

		function dragged() {
			d3.event.subject.fx = transform.invertX(d3.event.x);
			d3.event.subject.fy = transform.invertY(d3.event.y);
		}

		function dragEnded() {
			if (!d3.event.active) {
				simulation.alphaTarget(0);
			}

			d3.event.subject.fx = null;
			d3.event.subject.fy = null;
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
				context.lineWidth = Math.sqrt(d.value);
				context.strokeStyle = '#aaa';
				context.stroke();
			});

			// Draw nodes
			nodes.forEach(function (d, i) {
				context.beginPath();

				context.moveTo(d.x + nodeRadius, d.y);
				context.arc(d.x, d.y, nodeRadius, 0, 2 * Math.PI);
				context.fillStyle = colorScale(d.group);
				context.fill();

				context.strokeStyle = '#fff'
				context.lineWidth = '1.5'
				context.stroke();
			});

			context.restore();
		}

		// FUNCTIONS

		function generateGraphData(rawData) {
			let nodes = rawData.map(d => d);

			let links = generateLinksData(nodes);

			return {
				nodes: nodes,
				links: links
			};
		}

		function generateLinksData(nodes) {
			const groupByPrimaryDeterminantAnalyzed = d3.group(nodes.filter(d => d['Primary Determinant Analyzed']), d => d['Primary Determinant Analyzed']);
			const groupBySecondaryDeterminantAnalyzed1 = d3.group(nodes.filter(d => d['Secondary Determinant Analyzed 1']), d => d['Secondary Determinant Analyzed 1']);
			const groupBySecondaryDeterminantAnalyzed2 = d3.group(nodes.filter(d => d['Secondary Determinant Analyzed 2']), d => d['Secondary Determinant Analyzed 2']);
			const groupBySecondaryDeterminantAnalyzed3 = d3.group(nodes.filter(d => d['Secondary Determinant Analyzed 3']), d => d['Secondary Determinant Analyzed 3']);

			const groupedObjectPrimary = Object.fromEntries(groupByPrimaryDeterminantAnalyzed);
			const groupedObjectAnalyzed1 = Object.fromEntries(groupBySecondaryDeterminantAnalyzed1);
			const groupedObjectAnalyzed2 = Object.fromEntries(groupBySecondaryDeterminantAnalyzed2);
			const groupedObjectAnalyzed3 = Object.fromEntries(groupBySecondaryDeterminantAnalyzed3);

			let linksTotal = [];

			nodes.forEach(function (nodeData) {
				let primaryLinksForGivenNode = [];
				let analyzed1RelevantLinks = [];
				let analyzed2RelevantLinks = [];
				let analyzed3RelevantLinks = [];

				if (nodeData['Primary Determinant Analyzed']) {
					primaryLinksForGivenNode = groupedObjectPrimary[nodeData['Primary Determinant Analyzed']]
						.map(function (d) {
							return { source: nodeData.ID, target: d.ID, primary: true }
						});
				}

				if (nodeData['Secondary Determinant Analyzed 1']) {
					analyzed1RelevantLinks = groupedObjectAnalyzed1[nodeData['Secondary Determinant Analyzed 1']]
						.map(function (d) {
							return { source: nodeData.ID, target: d.ID, primary: false }
						});
				}

				if (nodeData['Secondary Determinant Analyzed 2']) {
					analyzed2RelevantLinks = groupedObjectAnalyzed2[nodeData['Secondary Determinant Analyzed 2']]
						.map(function (d) {
							return { source: nodeData.ID, target: d.ID, primary: false }
						});
				}

				if (nodeData['Secondary Determinant Analyzed 3']) {
					analyzed3RelevantLinks = groupedObjectAnalyzed3[nodeData['Secondary Determinant Analyzed 3']]
						.map(function (d) {
							return { source: nodeData.ID, target: d.ID, primary: false }
						});
				}

				linksTotal.push(primaryLinksForGivenNode);
				linksTotal.push(analyzed1RelevantLinks);
				linksTotal.push(analyzed2RelevantLinks);
				linksTotal.push(analyzed3RelevantLinks);
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
