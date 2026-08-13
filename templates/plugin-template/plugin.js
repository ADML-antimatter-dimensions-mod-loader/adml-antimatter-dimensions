/**
 * ADML v1 Plugin Template
 * 
 * This template demonstrates core ADML APIs:
 * - Styling injection (api.addStyle)
 * - Method patching (api.patch)
 * - Custom sidebar tab (api.registerTab)
 * - Persistent storage (api.storage)
 * - Lifecycle cleanup (onunload)
 */
class Plugin {
  constructor(api) {
    this.api = api;
    this.cleanupTasks = [];
  }

  onload() {
    this.api.logger.info("ADML Template Plugin loaded successfully.");

    // 1. Inject custom CSS styles safely
    const removeStyle = this.api.addStyle(`
      .adml-template-tab-box {
        padding: 24px;
        background: #0d151c;
        color: #edf1ec;
        font-family: Arial, Helvetica, sans-serif;
      }
      .adml-template-card {
        border: 1px solid #e6a35c;
        padding: 16px;
        margin-top: 12px;
        background: rgba(230,163,92,.05);
      }
    `);
    this.cleanupTasks.push(removeStyle);

    // 2. Register a custom sidebar tab
    this.api.registerTab("adml-template-tab", "Template Mod", container => {
      container.innerHTML = `
        <div class="adml-template-tab-box">
          <h2>ADML Custom Mod Tab</h2>
          <p>This tab was dynamically registered via the ADML v1 API.</p>
          <div class="adml-template-card">
            <strong>Persistent Counter:</strong> <span id="adml-counter-val">0</span> clicks
            <br/><br/>
            <button id="adml-counter-btn" style="padding: 8px 14px; background: #e6a35c; color: #0b1016; border: none; font-weight: bold; cursor: pointer;">Increment Counter</button>
          </div>
        </div>
      `;

      let count = this.api.storage.get("click_count", 0);
      const valSpan = container.querySelector("#adml-counter-val");
      valSpan.textContent = count;

      const btn = container.querySelector("#adml-counter-btn");
      const onClick = () => {
        count++;
        valSpan.textContent = count;
        this.api.storage.set("click_count", count);
      };
      btn.addEventListener("click", onClick);
      this.cleanupTasks.push(() => btn.removeEventListener("click", onClick));
    });

    // 3. Example hook into game updates
    const unSub = this.api.on("update", ({ delta }) => {
      // Periodic logic can go here
    });
    this.cleanupTasks.push(unSub);
  }

  onunload() {
    this.api.logger.info("ADML Template Plugin unloaded. Executing cleanup tasks.");
    this.cleanupTasks.forEach(task => task());
  }
}
