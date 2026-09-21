/** After Inspect builds a review, attach a splitkit score and persist it. */
(function () {
  if (!window.DeskInspect || !DeskInspect.runReview) return;
  var origRun = DeskInspect.runReview;
  DeskInspect.runReview = async function (form) {
    var review = await origRun(form);
    if (window.DeskSplit && window.Splitkit) {
      review.splitkit = {
        version: Splitkit.version,
        pin: DeskSplit.communityPin(),
        diverge: DeskSplit.compareCheckpoints(review)
      };
      try {
        sessionStorage.setItem("desk-current-review", JSON.stringify(review));
      } catch (e) {}
    }
    return review;
  };
  if (DeskInspect.render) {
    var origRender = DeskInspect.render;
    DeskInspect.render = function (review, mount) {
      origRender(review, mount);
      if (!mount || !review || !review.splitkit || !review.splitkit.diverge) return;
      var p = document.createElement("p");
      p.className = "small mt-3 mb-0";
      var match = review.splitkit.diverge.matchesPin ? "yes" : "no";
      p.innerHTML = "splitkit " + (review.splitkit.version || "") +
        " · community pin match at 316002: <strong>" + match + "</strong> · " +
        "<a href=\"https://github.com/psycho-v1/splitkit\">splitkit</a>";
      mount.appendChild(p);
    };
  }
})();
