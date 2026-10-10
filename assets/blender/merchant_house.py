"""Generates merchant-house.blend: a fictional two-storey merchant building.

Run with Blender, not plain Python:

    npm run asset:generate            # refuses to overwrite an existing .blend
    npm run asset:generate -- --force # overwrites it

This script only writes the .blend. Exporting the GLB is a separate step
(`npm run asset:export`), so a .blend that has been edited by hand can be
exported without being regenerated.

FICTIONAL ARCHITECTURAL STUDY. The building is invented. It is loosely inspired
by veranda-fronted merchant houses but reconstructs no real building, place or
period, and nothing here is historically verified.

Conventions (also stored in the .blend's "README" text block):
  - Units are metres. Z is up.
  - The front of the building faces -Y. The body extends towards +Y.
  - The origin is on the ground at the centre of the front edge.
"""

import math
import os
import random
import sys

import bmesh
import bpy
from mathutils import Matrix, Vector

# --------------------------------------------------------------------------
# Parameters. Change these and regenerate.
# --------------------------------------------------------------------------

WIDTH = 8.96  # overall, x. 2 cm clear of each neighbour on a 9.0 m lot
PARTY_WALL = 0.30  # thickness of the two side walls
VERANDA_DEPTH = 2.0
MAIN_DEPTH = 8.0  # main block, behind the veranda
WALL = 0.30  # facade and rear wall thickness

PLINTH = 0.30  # floor level of the ground storey
GROUND_STOREY = 3.20
UPPER_STOREY = 3.00

BAYS = 3
RIDGE_RISE = 2.0  # ridge height above the wall top
VERANDA_ROOF_PITCH = math.radians(12)
EAVE_FRONT = 0.40  # roof overhang beyond the veranda front
EAVE_REAR = 0.30
ROOF_THICKNESS = 0.12
PARAPET = 0.25  # how far the side walls rise above the roof

SEED = 7  # fixes the small colour variations, so builds are repeatable

# sRGB colours. One plain material each.
COLOURS = {
    "Plaster": "#E3D2B0",
    "Trim": "#EFE6D2",
    "Plinth": "#8C7B68",
    "Shutter": "#6C9C8B",
    "Timber": "#5B4130",
    "Boards": "#8A6A4B",
    "Roof": "#93574A",
    "Interior": "#3A3029",
}

COLLECTIONS = ["Structure", "Roof", "Veranda", "Doors", "Windows", "Details", "Guides"]

# --------------------------------------------------------------------------
# Derived dimensions
# --------------------------------------------------------------------------

HALF = WIDTH / 2
INNER = HALF - PARTY_WALL  # half-width between the side walls
DEPTH = VERANDA_DEPTH + MAIN_DEPTH
FLOOR_0 = PLINTH
FLOOR_1 = PLINTH + GROUND_STOREY
WALL_TOP = FLOOR_1 + UPPER_STOREY
FACADE_Y = VERANDA_DEPTH  # front face of the main block
RIDGE_Y = FACADE_Y + MAIN_DEPTH / 2
RIDGE_Z = WALL_TOP + RIDGE_RISE
MAIN_SLOPE = RIDGE_RISE / (MAIN_DEPTH / 2)
BAY = 2 * INNER / BAYS
DAMP_BAND = 1.2  # walls darken slightly below this height
PLINTH_STEP = 0.04  # the side walls stand this far back from the plinth's front edge

TINT = "Tint"
rng = random.Random(SEED)


def roof_top(y):
    """Height of the roof's upper surface at depth y."""
    if y <= FACADE_Y:
        return WALL_TOP - (FACADE_Y - y) * math.tan(VERANDA_ROOF_PITCH)
    if y <= RIDGE_Y:
        return WALL_TOP + (y - FACADE_Y) * MAIN_SLOPE
    return RIDGE_Z - (y - RIDGE_Y) * MAIN_SLOPE


# --------------------------------------------------------------------------
# Small mesh-building toolkit
# --------------------------------------------------------------------------


def srgb_to_linear(hex_colour):
    def channel(value):
        value /= 255
        return value / 12.92 if value <= 0.04045 else ((value + 0.055) / 1.055) ** 2.4

    h = hex_colour.lstrip("#")
    return tuple(channel(int(h[i : i + 2], 16)) for i in (0, 2, 4)) + (1.0,)


def vary(amount):
    """A tint a little below 1, different each call but the same every run."""
    return 1.0 - rng.random() * amount


def damp(co):
    """Walls are slightly darker near the ground."""
    t = min(max((co.z - FLOOR_0) / (DAMP_BAND - FLOOR_0), 0.0), 1.0)
    return 0.86 + 0.14 * (t * t * (3 - 2 * t))


class Builder:
    """Collects boxes and extruded profiles into one mesh, with a per-corner tint."""

    def __init__(self):
        self.bm = bmesh.new()
        self.layer = self.bm.loops.layers.float_color.new(TINT)

    def _tint(self, faces, tint):
        for face in faces:
            for loop in face.loops:
                value = tint(loop.vert.co) if callable(tint) else tint
                loop[self.layer] = (value, value, value, 1.0)

    def box(self, lo, hi, tint=1.0, tilt=0.0):
        """An axis-aligned box from corner `lo` to corner `hi`, optionally tilted about X."""
        lo, hi = Vector(lo), Vector(hi)
        verts = bmesh.ops.create_cube(self.bm, size=1.0)["verts"]
        bmesh.ops.scale(self.bm, vec=hi - lo, verts=verts)
        if tilt:
            bmesh.ops.rotate(self.bm, cent=(0, 0, 0), matrix=Matrix.Rotation(tilt, 3, "X"), verts=verts)
        bmesh.ops.translate(self.bm, vec=(lo + hi) / 2, verts=verts)
        self._tint({face for vert in verts for face in vert.link_faces}, tint)

    def _prism(self, ring_a, ring_b, tint):
        a = [self.bm.verts.new(co) for co in ring_a]
        b = [self.bm.verts.new(co) for co in ring_b]
        faces = [self.bm.faces.new(a), self.bm.faces.new(list(reversed(b)))]
        for i in range(len(a)):
            j = (i + 1) % len(a)
            faces.append(self.bm.faces.new((a[i], b[i], b[j], a[j])))
        bmesh.ops.recalc_face_normals(self.bm, faces=faces)
        self._tint(faces, tint)

    def prism_x(self, profile_yz, x0, x1, tint=1.0):
        """A (y, z) outline extruded along X."""
        self._prism([(x0, y, z) for y, z in profile_yz], [(x1, y, z) for y, z in profile_yz], tint)

    def prism_y(self, profile_xz, y0, y1, tint=1.0):
        """An (x, z) outline extruded along Y."""
        self._prism([(x, y0, z) for x, z in profile_xz], [(x, y1, z) for x, z in profile_xz], tint)

    def wall_face(self, x0, x1, z0, z1, y, openings, tint=1.0):
        """A flat wall face at depth y, facing -Y, with rectangular holes.

        `openings` are (x0, x1, z0, z1). A Solidify modifier gives it thickness,
        which is what produces the reveals inside each opening.
        """
        xs = sorted({x0, x1, *(o[0] for o in openings), *(o[1] for o in openings)})
        zs = sorted({z0, z1, DAMP_BAND, *(o[2] for o in openings), *(o[3] for o in openings)})
        grid = [[self.bm.verts.new((x, y, z)) for z in zs] for x in xs]
        faces = []
        for i in range(len(xs) - 1):
            for k in range(len(zs) - 1):
                cx, cz = (xs[i] + xs[i + 1]) / 2, (zs[k] + zs[k + 1]) / 2
                if any(o[0] < cx < o[1] and o[2] < cz < o[3] for o in openings):
                    continue
                faces.append(
                    self.bm.faces.new((grid[i][k], grid[i + 1][k], grid[i + 1][k + 1], grid[i][k + 1]))
                )
        self._tint(faces, tint)

    def to_object(self, name, collection, material, origin=None, rotation_z=0.0):
        """Finishes the mesh and wraps it in an object whose origin is `origin`.

        Without `origin`, the object's origin is put at the centre of the mesh.
        """
        mesh = self.to_mesh(name, origin)
        return place(name, mesh, collection, material, self.origin, rotation_z)

    def to_mesh(self, name, origin=None):
        if origin is None:
            xs, ys, zs = zip(*(vert.co for vert in self.bm.verts))
            origin = ((min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2, (min(zs) + max(zs)) / 2)
        self.origin = Vector(origin)
        bmesh.ops.translate(self.bm, vec=-self.origin, verts=self.bm.verts)
        mesh = bpy.data.meshes.new(name)
        self.bm.to_mesh(mesh)
        self.bm.free()
        mesh.color_attributes.active_color = mesh.color_attributes[TINT]
        mesh.color_attributes.render_color_index = mesh.color_attributes.find(TINT)
        return mesh


def place(name, mesh, collection, material, location, rotation_z=0.0):
    """Puts a mesh in the scene. Passing the same mesh twice shares it between objects."""
    if not mesh.materials:
        mesh.materials.append(MATERIALS[material])
    obj = bpy.data.objects.new(name, mesh)
    obj.location = location
    obj.rotation_euler = (0, 0, rotation_z)
    bpy.data.collections[collection].objects.link(obj)
    return obj


def box_object(name, collection, material, lo, hi, tint=1.0):
    builder = Builder()
    builder.box(lo, hi, tint)
    return builder.to_object(name, collection, material)


# --------------------------------------------------------------------------
# The file
# --------------------------------------------------------------------------


def start_empty_file():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.name = "MerchantHouse"
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.scale_length = 1.0
    for name in COLLECTIONS:
        scene.collection.children.link(bpy.data.collections.new(name))
    return scene


def make_materials():
    materials = {}
    for name, hex_colour in COLOURS.items():
        material = bpy.data.materials.new(name)
        material.use_nodes = True
        colour = srgb_to_linear(hex_colour)
        bsdf = material.node_tree.nodes["Principled BSDF"]
        bsdf.inputs["Base Color"].default_value = colour
        bsdf.inputs["Roughness"].default_value = 0.9
        bsdf.inputs["Metallic"].default_value = 0.0
        material.diffuse_color = colour  # what Solid viewport mode shows
        materials[name] = material
    return materials


# --------------------------------------------------------------------------
# Structure
# --------------------------------------------------------------------------


def ground_openings():
    """(x0, x1, z0, z1) of the ground-storey openings, left to right."""
    door = (-0.75, 0.75, FLOOR_0, FLOOR_0 + 2.5)
    openings = []
    for side in (-1, 1):
        cx = side * BAY
        openings.append((cx - 0.65, cx + 0.65, FLOOR_0 + 0.9, FLOOR_0 + 2.6))
    return [openings[0], door, openings[1]]


def upper_openings():
    return [(cx - 0.55, cx + 0.55, FLOOR_1, FLOOR_1 + 2.3) for cx in (-BAY, 0.0, BAY)]


def build_structure():
    box_object("Plinth", "Structure", "Plinth", (-HALF, 0, 0), (HALF, DEPTH, PLINTH), vary(0.04))

    # Side walls. They run the full depth, so the veranda sits between them,
    # and rise above the roof as parapets.
    front = PLINTH_STEP
    upper_outline = [
        (front, DAMP_BAND),
        (DEPTH, DAMP_BAND),
        (DEPTH, roof_top(DEPTH) + PARAPET),
        (RIDGE_Y, RIDGE_Z + PARAPET),
        (FACADE_Y, WALL_TOP + PARAPET),
        (front, roof_top(front) + PARAPET),
    ]
    for label, x0, x1 in (("L", -HALF, -INNER), ("R", INNER, HALF)):
        shade = vary(0.03)
        box_object(
            f"SideWall_{label}_Lower", "Structure", "Plaster",
            (x0, front, PLINTH), (x1, DEPTH, DAMP_BAND), lambda co, s=shade: damp(co) * s,
        )
        upper = Builder()
        upper.prism_x(upper_outline, x0, x1, shade)
        upper.to_object(f"SideWall_{label}_Upper", "Structure", "Plaster")

    facade = Builder()
    facade.wall_face(
        -INNER, INNER, PLINTH, roof_top(FACADE_Y) - ROOF_THICKNESS + 0.02, FACADE_Y,
        ground_openings() + upper_openings(), damp,
    )
    wall = facade.to_object("Facade", "Structure", "Plaster")
    solidify = wall.modifiers.new("Thickness", "SOLIDIFY")
    solidify.thickness = WALL
    solidify.offset = -1  # grows away from the street, so the front face stays put

    box_object(
        "RearWall", "Structure", "Plaster",
        (-INNER, DEPTH - WALL, PLINTH), (INNER, DEPTH, roof_top(DEPTH) - ROOF_THICKNESS + 0.02),
    )

    # A dark plane behind the facade, so open doors and windows show shadow, not sky.
    box_object(
        "Interior_Backing", "Structure", "Interior",
        (-INNER, FACADE_Y + WALL + 0.02, PLINTH), (INNER, FACADE_Y + WALL + 0.10, WALL_TOP - 0.2),
    )


# --------------------------------------------------------------------------
# Roof
# --------------------------------------------------------------------------


def roof_outline(lift=0.0, thickness=ROOF_THICKNESS):
    """The roof in section: rear eave, ridge, the break above the facade, front eave."""
    ys = [DEPTH + EAVE_REAR, RIDGE_Y, FACADE_Y, -EAVE_FRONT]
    top = [(y, roof_top(y) + lift) for y in ys]
    return top + [(y, z - thickness) for y, z in reversed(top)]


def build_roof():
    roof = Builder()
    # Lighter towards the ridge, as if weathered.
    roof.prism_x(roof_outline(), -INNER, INNER, lambda co: 0.90 + 0.10 * (co.z - 5.5) / (RIDGE_Z - 5.5))
    roof.to_object("Roof_Planes", "Roof", "Roof")

    # Raised ribs running down the slopes. One rib; an Array modifier repeats it.
    spacing = 0.62
    count = int((2 * INNER - 0.3) // spacing) + 1
    first = -(count - 1) * spacing / 2
    rib = Builder()
    rib.prism_x(roof_outline(lift=0.045, thickness=0.05), first - 0.03, first + 0.03, 0.88)
    rib_object = rib.to_object("Roof_Rib", "Roof", "Roof")
    array = rib_object.modifiers.new("Repeat", "ARRAY")
    array.count = count
    array.use_relative_offset = False
    array.use_constant_offset = True
    array.constant_offset_displace = (spacing, 0, 0)

    box_object(
        "Roof_RidgeCap", "Roof", "Roof",
        (-INNER, RIDGE_Y - 0.14, RIDGE_Z - 0.02), (INNER, RIDGE_Y + 0.14, RIDGE_Z + 0.10), 0.82,
    )
    eave = roof_top(-EAVE_FRONT)
    box_object(
        "Roof_Fascia_Front", "Roof", "Timber",
        (-INNER, -EAVE_FRONT - 0.03, eave - ROOF_THICKNESS - 0.08), (INNER, -EAVE_FRONT + 0.01, eave + 0.01),
        vary(0.06),
    )


# --------------------------------------------------------------------------
# Veranda
# --------------------------------------------------------------------------

POST_Y = 0.12  # centre line of the posts, just behind the front edge
LOWER_BEAM_Z = FLOOR_1 - 0.16 - 0.22  # underside of the beam carrying the balcony
UPPER_BEAM_TOP = roof_top(POST_Y) - ROOF_THICKNESS
UPPER_BEAM_Z = UPPER_BEAM_TOP - 0.22


def post_positions():
    """Post centre lines: one at each side wall and one at each bay division."""
    inner = [-INNER + BAY * i for i in range(1, BAYS)]
    return [-INNER + 0.09] + inner + [INNER - 0.09]


def bracket_mesh(reach):
    """A curved timber bracket: fits in the corner between a post and a beam."""
    steps = 6
    outline = [(0.0, 0.0), (reach, 0.0)]
    for i in range(1, steps):
        angle = math.pi / 2 * i / steps
        outline.append((reach - reach * math.sin(angle) * 0.85, -reach + reach * math.cos(angle) * 0.85))
    outline.append((0.0, -reach))
    builder = Builder()
    builder.prism_y(outline, -0.025, 0.025, 0.94)
    return builder.to_mesh("Bracket", origin=(0, 0, 0))


def build_veranda():
    posts = post_positions()

    # Posts. Each storey shares one mesh, so editing one post edits them all.
    for storey, size, z0, z1 in (
        ("Ground", 0.16, FLOOR_0, LOWER_BEAM_Z),
        ("Upper", 0.13, FLOOR_1, UPPER_BEAM_Z),
    ):
        builder = Builder()
        builder.box((-size / 2, -size / 2, 0), (size / 2, size / 2, z1 - z0), 0.96)
        mesh = builder.to_mesh(f"Post_{storey}", origin=(0, 0, 0))
        for index, x in enumerate(posts, start=1):
            post = place(f"Post_{storey}_{index}", mesh, "Veranda", "Timber", (x, POST_Y, z0))
            if "Chamfer" not in post.modifiers:
                bevel = post.modifiers.new("Chamfer", "BEVEL")
                bevel.width = 0.014
                bevel.segments = 1

    # Beams on top of each row of posts.
    for storey, z0 in (("Lower", LOWER_BEAM_Z), ("Upper", UPPER_BEAM_Z)):
        box_object(
            f"Beam_{storey}", "Veranda", "Timber",
            (-INNER, POST_Y - 0.07, z0), (INNER, POST_Y + 0.07, z0 + 0.22), vary(0.05),
        )

    # Brackets where posts meet beams. One mesh, turned round for the other side.
    bracket = bracket_mesh(0.42)
    for storey, z in (("Ground", LOWER_BEAM_Z), ("Upper", UPPER_BEAM_Z)):
        for index, x in enumerate(posts, start=1):
            if index > 1:
                place(f"Bracket_{storey}_{index}_L", bracket, "Veranda", "Timber", (x, POST_Y, z), math.pi)
            if index < len(posts):
                place(f"Bracket_{storey}_{index}_R", bracket, "Veranda", "Timber", (x, POST_Y, z))

    # Balcony floor: boards, with their front edge showing.
    floor = Builder()
    board = 0.22
    boards = int(2 * INNER / board)
    for i in range(boards):
        x0 = -INNER + i * (2 * INNER / boards)
        floor.box((x0, 0.0, FLOOR_1 - 0.16), (x0 + 2 * INNER / boards, FACADE_Y, FLOOR_1), vary(0.10))
    floor.to_object("Balcony_Floor", "Veranda", "Boards")

    # A boarded ceiling under the veranda roof: what you see looking up from the street.
    ceiling = Builder()
    under = [(y, roof_top(y) - ROOF_THICKNESS) for y in (FACADE_Y, -EAVE_FRONT + 0.02)]
    ceiling.prism_x(under + [(y, z - 0.03) for y, z in reversed(under)], -INNER, INNER, 0.92)
    ceiling.to_object("Veranda_Ceiling", "Veranda", "Boards")

    # Balcony balustrade: two rails per bay and a row of balusters between them.
    rail_low, rail_high = FLOOR_1 + 0.10, FLOOR_1 + 0.95
    baluster = Builder()
    baluster.box((-0.016, -0.022, 0), (0.016, 0.022, rail_high - rail_low - 0.06), 0.92)
    baluster_mesh = baluster.to_mesh("Baluster", origin=(0, 0, 0))
    for bay in range(len(posts) - 1):
        x0, x1 = posts[bay] + 0.065, posts[bay + 1] - 0.065
        for label, z, depth in (("Top", rail_high, 0.07), ("Bottom", rail_low, 0.05)):
            box_object(
                f"Balustrade_Rail{label}_Bay{bay + 1}", "Veranda", "Timber",
                (x0, POST_Y - 0.035, z - depth), (x1, POST_Y + 0.035, z), vary(0.05),
            )
        spacing = 0.15
        count = int((x1 - x0) // spacing)
        start = (x0 + x1) / 2 - (count - 1) * spacing / 2
        row = place(f"Balusters_Bay{bay + 1}", baluster_mesh, "Veranda", "Timber", (start, POST_Y, rail_low))
        array = row.modifiers.new("Repeat", "ARRAY")
        array.count = count
        array.use_relative_offset = False
        array.use_constant_offset = True
        array.constant_offset_displace = (spacing, 0, 0)

    # Ground level is closed off: a low plaster wall in the side bays and a
    # timber gate in the middle one. The veranda is not walkable in the game.
    wall_top = FLOOR_0 + 0.78
    for bay in range(len(posts) - 1):
        x0, x1 = posts[bay] + 0.08, posts[bay + 1] - 0.08
        if bay == (len(posts) - 1) // 2:
            build_gate(x0, x1, FLOOR_0, FLOOR_0 + 0.98)
            continue
        box_object(
            f"Veranda_Parapet_Bay{bay + 1}", "Veranda", "Plaster",
            (x0, POST_Y - 0.09, FLOOR_0), (x1, POST_Y + 0.09, wall_top), lambda co: damp(co) * 0.98,
        )
        box_object(
            f"Veranda_ParapetCap_Bay{bay + 1}", "Veranda", "Trim",
            (x0, POST_Y - 0.12, wall_top), (x1, POST_Y + 0.12, wall_top + 0.05),
        )


def build_gate(x0, x1, z0, z1):
    width = (x1 - x0) / 2 - 0.01
    height = z1 - z0
    leaf = Builder()
    leaf.box((0, -0.02, 0), (0.06, 0.02, height), 0.95)
    leaf.box((width - 0.06, -0.02, 0), (width, 0.02, height), 0.95)
    leaf.box((0.06, -0.02, 0.06), (width - 0.06, 0.02, 0.13), 0.90)
    leaf.box((0.06, -0.02, height - 0.09), (width - 0.06, 0.02, height - 0.02), 0.90)
    slats = 7
    for i in range(slats):
        x = 0.06 + (width - 0.12) * (i + 0.5) / slats
        leaf.box((x - 0.022, -0.012, 0.13), (x + 0.022, 0.012, height - 0.09), vary(0.10))
    mesh = leaf.to_mesh("Gate_Leaf", origin=(0, 0, 0))
    place("Gate_Leaf_L", mesh, "Veranda", "Timber", (x0, POST_Y, z0))
    place("Gate_Leaf_R", mesh, "Veranda", "Timber", (x1, POST_Y, z0), math.pi)


# --------------------------------------------------------------------------
# Doors and windows
# --------------------------------------------------------------------------


def shutter_mesh(name, width, height, panel=0.0):
    """One louvred leaf, hinged along its left edge (the object's origin).

    `panel` is the height of a solid lower panel, used on the tall door leaves.
    """
    stile, rail = 0.065, 0.075
    leaf = Builder()
    leaf.box((0, -0.02, 0), (stile, 0.02, height), 0.97)
    leaf.box((width - stile, -0.02, 0), (width, 0.02, height), 0.97)
    leaf.box((stile, -0.02, 0), (width - stile, 0.02, rail), 0.93)
    leaf.box((stile, -0.02, height - rail), (width - stile, 0.02, height), 0.93)
    louvres_from = rail
    if panel:
        leaf.box((stile, -0.012, rail), (width - stile, 0.012, panel), 0.90)
        leaf.box((stile, -0.02, panel), (width - stile, 0.02, panel + rail), 0.93)
        louvres_from = panel + rail
    pitch = 0.085
    count = int((height - rail - louvres_from) // pitch)
    for i in range(count):
        z = louvres_from + (height - rail - louvres_from) * (i + 0.5) / count
        leaf.box(
            (stile, -0.034, z - 0.006), (width - stile, 0.034, z + 0.006),
            vary(0.07), tilt=math.radians(-32),
        )
    return leaf.to_mesh(name, origin=(0, 0, 0))


def hang_pair(name, collection, mesh, opening, swing_left, swing_right, material="Shutter"):
    """Hangs two leaves on an opening. Swings are in degrees; 0 is shut, positive opens outwards."""
    x0, x1, z0, _ = opening
    y = FACADE_Y - 0.03
    place(f"{name}_L", mesh, collection, material, (x0, y, z0), -math.radians(swing_left))
    place(f"{name}_R", mesh, collection, material, (x1, y, z0), math.pi + math.radians(swing_right))


def door_mesh(width, height):
    """A panelled door leaf, hinged along its left edge."""
    leaf = Builder()
    leaf.box((0, -0.018, 0), (width, 0.018, height), 0.90)
    stile, rail = 0.09, 0.11
    for x in (0, width - stile):
        leaf.box((x, -0.032, 0), (x + stile, 0.032, height), 0.98)
    for z in (0, height * 0.42, height - rail):
        leaf.box((stile, -0.032, z), (width - stile, 0.032, z + rail), 0.95)
    return leaf.to_mesh("Door_Leaf", origin=(0, 0, 0))


def build_doors_and_windows():
    ground = ground_openings()
    upper = upper_openings()

    # Ground floor: a panelled double door between two shuttered windows.
    door = ground[1]
    hang_pair("Door_Main", "Doors", door_mesh((door[1] - door[0]) / 2, door[3] - door[2]), door, 0, 14)

    window = ground[0]
    window_leaf = shutter_mesh("Shutter_Window", (window[1] - window[0]) / 2, window[3] - window[2])
    hang_pair("Shutter_Ground_Bay1", "Windows", window_leaf, ground[0], 0, 0)
    hang_pair("Shutter_Ground_Bay3", "Windows", window_leaf, ground[2], 105, 118)

    # Upper floor: three tall louvred doors onto the balcony.
    tall = upper[0]
    tall_leaf = shutter_mesh("Shutter_Door", (tall[1] - tall[0]) / 2, tall[3] - tall[2], panel=0.72)
    hang_pair("Shutter_Upper_Bay1", "Doors", tall_leaf, upper[0], 28, 0)
    hang_pair("Shutter_Upper_Bay2", "Doors", tall_leaf, upper[1], 112, 104)
    hang_pair("Shutter_Upper_Bay3", "Doors", tall_leaf, upper[2], 0, 0)


# --------------------------------------------------------------------------
# Details
# --------------------------------------------------------------------------


def build_details():
    # Raised plaster surrounds, proud of the wall so they catch light and shadow.
    proud, band = 0.05, 0.13
    openings = [("Ground", i, o) for i, o in enumerate(ground_openings(), 1)]
    openings += [("Upper", i, o) for i, o in enumerate(upper_openings(), 1)]
    for storey, bay, (x0, x1, z0, z1) in openings:
        surround = Builder()
        surround.box((x0 - band, FACADE_Y - proud, z0), (x0, FACADE_Y, z1 + band))
        surround.box((x1, FACADE_Y - proud, z0), (x1 + band, FACADE_Y, z1 + band))
        surround.box((x0, FACADE_Y - proud, z1), (x1, FACADE_Y, z1 + band))
        if z0 > FLOOR_0 + 0.1 and storey == "Ground":
            surround.box((x0 - band - 0.04, FACADE_Y - 0.11, z0 - 0.07), (x1 + band + 0.04, FACADE_Y, z0))
        surround.to_object(f"Surround_{storey}_Bay{bay}", "Details", "Trim")

    # Coping along the top of each side wall: a pale line against the sky.
    ys = [PLINTH_STEP, FACADE_Y, RIDGE_Y, DEPTH]
    top = [(y, roof_top(y) + PARAPET) for y in ys]
    outline = [(y, z + 0.07) for y, z in top] + list(reversed(top))
    for label, x0, x1 in (("L", -HALF, -INNER + 0.05), ("R", INNER - 0.05, HALF)):
        coping = Builder()
        coping.prism_x(outline, x0, x1)
        coping.to_object(f"Coping_{label}", "Details", "Trim")

    # A string course across the front of each side wall, level with the balcony floor.
    for label, x0, x1 in (("L", -HALF, -INNER), ("R", INNER, HALF)):
        box_object(
            f"StringCourse_{label}", "Details", "Trim",
            (x0, 0.0, FLOOR_1 - 0.16), (x1, PLINTH_STEP + 0.01, FLOOR_1),
        )


# --------------------------------------------------------------------------
# Guides: not part of the building and never exported
# --------------------------------------------------------------------------


def build_guides(scene):
    guides = bpy.data.collections["Guides"]

    arrow = bpy.data.objects.new("FRONT_points_to_the_street", None)
    arrow.empty_display_type = "SINGLE_ARROW"
    arrow.empty_display_size = 2.0
    arrow.rotation_euler = (math.radians(90), 0, 0)  # the arrow points along -Y
    guides.objects.link(arrow)

    camera_data = bpy.data.cameras.new("Preview_Camera")
    camera_data.lens = 35
    camera = bpy.data.objects.new("Preview_Camera", camera_data)
    camera.location = (-9.5, -15.0, 4.6)
    target = Vector((0.0, 3.0, 3.6))
    camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
    guides.objects.link(camera)
    scene.camera = camera

    sun_data = bpy.data.lights.new("Preview_Sun", "SUN")
    sun_data.energy = 3.0
    sun = bpy.data.objects.new("Preview_Sun", sun_data)
    sun.rotation_euler = (math.radians(52), 0, math.radians(-38))
    guides.objects.link(sun)

    readme = bpy.data.texts.new("README")
    readme.write(
        "Merchant house: a FICTIONAL architectural study for the game Time Machine.\n"
        "It reconstructs no real building, place or period.\n\n"
        "Conventions\n"
        "  Units: metres. Z is up.\n"
        "  Front faces -Y (towards the street). The body extends towards +Y.\n"
        "  Origin: on the ground, at the centre of the front edge.\n"
        "  Everything below 2.2 m must stay at Y >= 0 and inside the width,\n"
        "  because the game's collision is a box on the lot, not this mesh.\n\n"
        "Collections\n"
        "  Structure, Roof, Veranda, Doors, Windows, Details: the building.\n"
        "  Guides: camera, light and the front arrow. Never exported.\n\n"
        "Colour\n"
        "  Each material is one plain colour. The 'Tint' colour attribute on each\n"
        "  mesh multiplies it slightly, for variation. In Solid view, set\n"
        "  Viewport Shading > Color > Attribute to see it.\n\n"
        "Exporting\n"
        "  npm run asset:export   exports this file as it is to the game's GLB.\n"
        "  npm run asset:generate rebuilds this file from the script and\n"
        "  DISCARDS manual edits. It refuses unless given --force.\n"
    )


# --------------------------------------------------------------------------


def summary():
    depsgraph = bpy.context.evaluated_depsgraph_get()
    lo = Vector((math.inf,) * 3)
    hi = Vector((-math.inf,) * 3)
    triangles = 0
    print("\nCollections")
    for name in COLLECTIONS:
        objects = bpy.data.collections[name].objects
        print(f"  {name:<10} {len(objects):>3} objects")
        if name == "Guides":
            continue
        for obj in objects:
            evaluated = obj.evaluated_get(depsgraph)
            mesh = evaluated.to_mesh()
            mesh.calc_loop_triangles()
            triangles += len(mesh.loop_triangles)
            for vert in mesh.vertices:
                co = evaluated.matrix_world @ vert.co
                lo = Vector(map(min, lo, co))
                hi = Vector(map(max, hi, co))
            evaluated.to_mesh_clear()
    size = hi - lo
    print(f"Meshes shared between objects: {sum(1 for m in bpy.data.meshes if m.users > 1)}")
    print(f"Materials: {', '.join(sorted(m.name for m in bpy.data.materials))}")
    print(f"Triangles with modifiers applied: {triangles}")
    print(f"Width  (X): {size.x:.3f} m   from {lo.x:.3f} to {hi.x:.3f}")
    print(f"Depth  (Y): {size.y:.3f} m   from {lo.y:.3f} to {hi.y:.3f}")
    print(f"Height (Z): {size.z:.3f} m   from {lo.z:.3f} to {hi.z:.3f}")


def main():
    arguments = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    here = os.path.dirname(os.path.abspath(__file__))
    target = os.path.normpath(os.path.join(here, "..", "merchant-house", "merchant-house.blend"))

    if os.path.exists(target) and "--force" not in arguments:
        sys.exit(
            f"\n{target} already exists.\n"
            "Regenerating would discard any edits made to it in Blender.\n"
            "To export it as it is:      npm run asset:export\n"
            "To regenerate it anyway:    npm run asset:generate -- --force\n"
        )

    scene = start_empty_file()
    global MATERIALS
    MATERIALS = make_materials()
    build_structure()
    build_roof()
    build_veranda()
    build_doors_and_windows()
    build_details()
    build_guides(scene)
    summary()

    os.makedirs(os.path.dirname(target), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=target)
    print(f"\nSaved {target}")


MATERIALS = {}

if __name__ == "__main__":
    main()
