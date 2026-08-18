// Remove template-only demo media/content before a project is sent to an APK build/export job.
// Live Design Studio + Preview keep demoOnly content so users can see and edit the template.
export function stripDemoContent(definition) {
  const clone = structuredClone(definition || {});
  for (const page of Object.values(clone.pages || {})) {
    page.components = Array.isArray(page.components)
      ? page.components
          .filter((component) => component?.demoOnly !== true && component?.props?.demoOnly !== true)
          .map((component) => {
            if (component?.props && typeof component.props === 'object') {
              const { demoOnly, sampleData, ...props } = component.props;
              return { ...component, props };
            }
            return component;
          })
      : [];
  }
  if (clone.assets && Array.isArray(clone.assets.files)) {
    clone.assets.files = clone.assets.files.filter((asset) => asset?.demoOnly !== true);
  }
  return clone;
}

export function prepareForApkBuild(definition) {
  return stripDemoContent(definition);
}
