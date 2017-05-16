import { NamespaceSpec, PropertySpec } from "./namespace";
import { assert } from "chai";

// Recursively check all the properties of the spec against
// the object.
export function checkProps(name: string, obj: any, spec: NamespaceSpec): void {
  if (!name || !obj || !spec) return;

  assert.isDefined(obj, `${name} is defined`);

  const namedProps = ['is', 'isName', 'args'];
  const propSpec = (spec as any) as PropertySpec;

  if (propSpec.is !== undefined) {
    let name = propSpec.isName || propSpec.is.name;
    let instanceOfCheck = obj instanceof propSpec.is || obj.constructor === propSpec.is;
    assert.ok(instanceOfCheck, `expected ${name} but found ${(obj.constructor.name || (obj + ''))}`);
  }

  if (propSpec.args !== undefined) {
    assert.equal(obj.length, propSpec.args, `${name} takes ${propSpec.args} arguments, passed ${obj.length}`);
  }

  for (let prop in spec) {
    if (!spec.hasOwnProperty(prop) || namedProps.indexOf(prop) !== -1) {
      continue;
    }

    checkProps(name + (name !== '' ? '.' : '') + prop,
              obj[prop], spec[prop] as NamespaceSpec);
  }
}