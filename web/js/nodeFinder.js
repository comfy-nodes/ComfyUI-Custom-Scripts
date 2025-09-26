import { app } from "../../../scripts/app.js";
import { api } from "../../../scripts/api.js";

// Adds a menu option to toggle follow the executing node
// Adds a menu option to go to the currently executing node
// Adds a menu option to go to a node by type

app.registerExtension({
	name: "pysssss.NodeFinder",
	setup() {
		let followExecution = false;
		let lastExecutingNodeId = null;
		let clearTimer = null;

		const setLastExecuting = (id) => {
			if (clearTimer) {
				clearTimeout(clearTimer);
				clearTimer = null;
			}
			lastExecutingNodeId = id ?? null;
		};

		const centerNode = (id) => {
			if (!followExecution || !id) return;
			const node = app.graph.getNodeById(id);
			if (!node) return;
			app.canvas.centerOnNode(node);
		};

		api.addEventListener("executing", ({ detail }) => {
			const id =
				detail && typeof detail === "object"
					? (detail.display_node ?? detail.node ?? detail?.data?.display_node ?? detail?.data?.node ?? null)
					: (detail ?? null);
			setLastExecuting(id);
			if (id) centerNode(id);
		});

		api.addEventListener("executed", ({ detail }) => {
			if (clearTimer) clearTimeout(clearTimer);
			clearTimer = setTimeout(() => {
				lastExecutingNodeId = null;
				clearTimer = null;
			}, 300);
		});

		// Add canvas menu options
		const orig = LGraphCanvas.prototype.getCanvasMenuOptions;
		LGraphCanvas.prototype.getCanvasMenuOptions = function () {
			const options = orig.apply(this, arguments);
			options.push(null, {
				content: followExecution ? "Stop following execution" : "Follow execution",
				callback: () => {
					if ((followExecution = !followExecution)) {
						centerNode(lastExecutingNodeId);
					}
				},
			});
			if (lastExecutingNodeId) {
				options.push({
					content: "Show executing node",
					callback: () => {
						const node = app.graph.getNodeById(lastExecutingNodeId);
						if (!node) return;
						app.canvas.centerOnNode(node);
					},
				});
			}

			const nodes = app.graph._nodes;
			const types = nodes.reduce((p, n) => {
				if (n.type in p) {
					p[n.type].push(n);
				} else {
					p[n.type] = [n];
				}
				return p;
			}, {});
			options.push({
				content: "Go to node",
				has_submenu: true,
				submenu: {
					options: Object.keys(types)
						.sort()
						.map((t) => ({
							content: t,
							has_submenu: true,
							submenu: {
								options: types[t]
									.sort((a, b) => a.pos[0] - b.pos[0])
									.map((n) => ({
										content: `${n.getTitle()} - #${n.id} (${n.pos[0]}, ${n.pos[1]})`,
										callback: () => app.canvas.centerOnNode(n),
									})),
							},
						})),
				},
			});

			return options;
		};
	},
});
