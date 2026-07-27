import { nextTick, ref, watch } from 'vue';

export function useDishSectionIndex(sections) {
  const activeSectionId = ref('');

  watch(
    sections,
    (nextSections) => {
      if (!nextSections.some((section) => section.id === activeSectionId.value)) {
        activeSectionId.value = nextSections[0]?.id ?? '';
      }
    },
    { immediate: true },
  );

  async function jumpToSection(sectionId) {
    activeSectionId.value = sectionId;
    await nextTick();
    document.querySelector(`[data-dish-section="${sectionId}"]`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }

  function syncActiveSection(event) {
    const containerTop = event.currentTarget.getBoundingClientRect().top;
    const sectionElements = [...event.currentTarget.querySelectorAll('[data-dish-section]')];
    const nearest = sectionElements.reduce((current, element) => {
      const distance = Math.abs(element.getBoundingClientRect().top - containerTop - 16);
      return !current || distance < current.distance
        ? { distance, id: element.dataset.dishSection }
        : current;
    }, null);

    if (nearest) {
      activeSectionId.value = nearest.id;
    }
  }

  return {
    activeSectionId,
    jumpToSection,
    syncActiveSection,
  };
}
