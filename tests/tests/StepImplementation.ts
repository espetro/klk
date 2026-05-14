import { Step, BeforeSuite, AfterSuite } from "gauge-ts";
import { execSync } from "child_process";
import { mkdirSync } from "fs";
import { join } from "path";

export default class StepImplementation {
  private screenshotDir = join(process.cwd(), "screenshots");

  @BeforeSuite()
  public async beforeSuite() {
    // Create screenshots directory if it doesn't exist
    mkdirSync(this.screenshotDir, { recursive: true });
    console.log("Screenshots will be saved to:", this.screenshotDir);
  }

  @AfterSuite()
  public async afterSuite() {
    try {
      // Close agent-device session
      execSync("agent-device close", { stdio: "inherit" });
    } catch (e) {
      // Session might already be closed
      console.log("Note: agent-device session was already closed or not open");
    }
  }

  @Step("Launch the Events App on iOS simulator")
  public async launchApp() {
    try {
      // Open an agent-device session with the Events App
      const output = execSync(
        "agent-device open 'Events App' --platform ios",
        { encoding: "utf-8", stdio: "pipe" }
      );
      console.log("App session opened:", output);
    } catch (e: any) {
      throw new Error(
        `Failed to launch Events App: ${e.message}. Make sure the iOS simulator is running and the app is installed.`
      );
    }
  }

  @Step("Take a screenshot named <name>")
  public async takeScreenshot(name: string) {
    try {
      const screenshotPath = join(this.screenshotDir, `${name}.png`);
      execSync(`agent-device screenshot "${screenshotPath}"`, {
        stdio: "inherit",
      });
      console.log(`Screenshot saved to: ${screenshotPath}`);
    } catch (e: any) {
      throw new Error(`Failed to take screenshot: ${e.message}`);
    }
  }

  @Step("The feed screen should be visible")
  public async verifyFeedVisible() {
    try {
      // Get the accessibility tree snapshot
      const snapshot = execSync("agent-device snapshot", {
        encoding: "utf-8",
        stdio: "pipe",
      });

      // Check for key UI elements that indicate the feed is visible
      const feedIndicators = [
        '"Feed"', // Tab or screen title
        '"calendar', // Events icon
        '"Events"', // Common label
      ];

      const hasUI = feedIndicators.some(
        (indicator) =>
          snapshot.toLowerCase().includes(indicator.toLowerCase()) ||
          snapshot.includes(indicator)
      );

      if (!hasUI) {
        console.error("Accessibility Tree:", snapshot);
        throw new Error(
          "Feed screen not visible. Expected feed UI elements not found in accessibility tree."
        );
      }

      console.log("✓ Feed screen is visible");
    } catch (e: any) {
      throw new Error(`Failed to verify feed: ${e.message}`);
    }
  }
}
