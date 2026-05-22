async function boot() {
  hidePage();

  try {
    cleanVisibleUrl();

    let { slug, phone } = getSession();

    if (slug && !phone) {
      const sub = await resolveSubBySlug(slug);
      if (sub?.phone) phone = normPhone(sub.phone);
      if (sub?.slug) slug = normSlug(sub.slug);
    }

    if (phone && !slug) {
      const sub = await resolveSubByPhone(phone);
      if (sub?.slug) slug = normSlug(sub.slug);
    }

    if (slug || phone) {
      rememberIdentity({ slug, phone });
    }

    if (!slug && !phone) {
      if (ALLOW_PREVIEW_WITHOUT_IDENTITY) {
        setState({
          preview: true,
          access_ok: false,
          reason: "preview_no_identity",
          slug: "",
          phone: "",
          module: MODULE_CODE,
          access_module: ACCESS_MODULE_CODE
        });

        showPage();
        return state;
      }

      goLogin();
      return null;
    }

    if (phone) {
      let ok = hasValidCachedAccess(phone);

      if (!ok) {
        ok = await checkAccess(phone);
      }

      if (ok) {
        rememberIdentity({ slug, phone });

        setState({
          preview: false,
          access_ok: true,
          reason: "access_ok",
          slug: normSlug(slug),
          phone: normPhone(phone),
          module: MODULE_CODE,
          access_module: ACCESS_MODULE_CODE
        });

        cleanVisibleUrl();
        showPage();
        return state;
      }

      if (ALLOW_PREVIEW_WITHOUT_IDENTITY) {
        setState({
          preview: true,
          access_ok: false,
          reason: "no_subscription",
          slug: normSlug(slug),
          phone: normPhone(phone),
          module: MODULE_CODE,
          access_module: ACCESS_MODULE_CODE
        });

        showPage();
        return state;
      }

      goLogin();
      return null;
    }

    if (ALLOW_PREVIEW_WITHOUT_IDENTITY) {
      setState({
        preview: true,
        access_ok: false,
        reason: "unknown_identity",
        slug: normSlug(slug),
        phone: "",
        module: MODULE_CODE,
        access_module: ACCESS_MODULE_CODE
      });

      showPage();
      return state;
    }

    /* DIGIY FIX — anti-mauvaise boucle :
       jamais vers commencer à payer sans identité complète.
       On revient au PIN, puis le PIN vérifie ABOS EXPLORE_BOOST. */
    goLogin();
    return null;
  } catch (e) {
    console.error("DIGIY_GUARD boot error:", e);

    setState({
      preview: false,
      access_ok: false,
      reason: "guard_error",
      slug: "",
      phone: "",
      module: MODULE_CODE,
      access_module: ACCESS_MODULE_CODE
    });

    goLogin();
    return null;
  }
}
