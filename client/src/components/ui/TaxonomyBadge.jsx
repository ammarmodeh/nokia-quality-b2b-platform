import Badge from "./Badge";

/** Category · Sub-category badge in the category's colour. */
const TaxonomyBadge = ({ tax, short = false, sx }) =>
  tax ? (
    <Badge color={tax.color} sx={sx} title={tax.label}>
      {short && tax.subCategory ? `${tax.category === "OJO Snags" ? "OJO" : tax.category} · ${tax.subCategory}` : tax.label}
    </Badge>
  ) : null;

export default TaxonomyBadge;
