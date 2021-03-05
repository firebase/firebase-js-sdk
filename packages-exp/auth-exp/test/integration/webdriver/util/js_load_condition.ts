import { Condition } from "selenium-webdriver";

/**
 * A condition that looks for the presence of a specified function. This is
 * used with WebDriver .wait() as a proxy for determining when the JS has
 * finished loading in a page.
 */
export class JsLoadCondition extends Condition<boolean> {
  constructor(globalValue: string) {
    super(`Waiting for global value ${globalValue}`, driver => {
      return driver.executeScript(`return typeof ${globalValue} !== 'undefined';`);
    });
  }
}