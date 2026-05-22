const { Step, BeforeSuite, AfterSuite } = require("gauge-ts");
const { execSync } = require("child_process");
const { mkdirSync } = require("fs");
const { join } = require("path");

let screenshotDir;

class StepImplementation {
  beforeSuite() {
    screenshotDir = join(process.cwd(), "screenshots");
    mkdirSync(screenshotDir, { recursive: true });
    console.log("Screenshots will be saved to:", screenshotDir);
  }

  afterSuite() {
    try {
      execSync("agent-device close", { stdio: "inherit" });
    } catch (e) {
      console.log("Note: agent-device session was already closed or not open");
    }
  }

  launchApp() {
    try {
      const output = execSync("agent-device open 'Events App' --platform ios", {
        encoding: "utf-8",
        stdio: "pipe",
      });
      console.log("App session opened:", output);
    } catch (e) {
      throw new Error(
        `Failed to launch Events App: ${e.message}. Make sure the iOS simulator is running and the app is installed.`,
      );
    }
  }

  takeScreenshot(name) {
    try {
      const screenshotPath = join(screenshotDir, `${name}.png`);
      execSync(`agent-device screenshot "${screenshotPath}"`, {
        stdio: "inherit",
      });
      console.log(`Screenshot saved to: ${screenshotPath}`);
    } catch (e) {
      throw new Error(`Failed to take screenshot: ${e.message}`);
    }
  }

  verifyFeedVisible() {
    try {
      const snapshot = execSync("agent-device snapshot", {
        encoding: "utf-8",
        stdio: "pipe",
      });

      const feedIndicators = ['"Feed"', '"calendar', '"Events"'];

      const hasUI = feedIndicators.some(
        (indicator) =>
          snapshot.toLowerCase().includes(indicator.toLowerCase()) || snapshot.includes(indicator),
      );

      if (!hasUI) {
        console.error("Accessibility Tree:", snapshot);
        throw new Error(
          "Feed screen not visible. Expected feed UI elements not found in accessibility tree.",
        );
      }

      console.log("✓ Feed screen is visible");
    } catch (e) {
      throw new Error(`Failed to verify feed: ${e.message}`);
    }
  }
}

// Apply decorators
BeforeSuite()(StepImplementation.prototype, "beforeSuite");
AfterSuite()(StepImplementation.prototype, "afterSuite");
Step("Launch the Events App on iOS simulator")(StepImplementation.prototype, "launchApp");
Step("Take a screenshot named <name>")(StepImplementation.prototype, "takeScreenshot");
Step("The feed screen should be visible")(StepImplementation.prototype, "verifyFeedVisible");

module.exports = StepImplementation;
