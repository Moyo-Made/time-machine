"""Generates ilojo-bar.blend: the Casa do Fernandez (Ilojo Bar, Olaiya House) as
it stood on Tinubu Square, Lagos, on 1 August 2016.

Run with Blender, not plain Python:

    npm run asset:generate:ilojo            # refuses to overwrite an existing .blend
    npm run asset:generate:ilojo -- --force # overwrites it

This script only writes the .blend. Exporting the GLB is a separate step
(`npm run asset:export:ilojo`).

A SIMPLIFIED RECONSTRUCTION FROM CITED SOURCES. It is not a survey and not a
record of the building's detail. What it shows was counted or measured in
photographs; what could not be was replaced by the plainest form that keeps
the outline. The research is in docs/research/milestone-05/, and the source
ids below (C-12, T-deeds and so on) are the ones used there and in
src/content/sources.ts.

The model is in parts, one collection each, because each part rests on
something different. The game holds what each part rests on; this file only
has to keep the parts apart and name them:

  Part.upper-floor    The upper storey of the front, as photographed on
                      1 August 2016 (C-12, C-13).
  Part.parapet        The parapet of the front, same photographs.
  Part.ground-floor   Not visible on that day: the market hides it. Plain.
  Part.bamgbose-side  The side on Bamgbose Street, from two undated
                      photographs (C-05, C-06).
  Part.figure-marker  A figure stood on the parapet. Its shape is not
                      established, so this is a plain block, not a figure.
  Part.cap-and-rear   Not reconstructed: a plain closing mass.

Conventions (also stored in the .blend's "README" text block):
  - Units are metres. Z is up.
  - The front of the building faces -Y. The body extends towards +Y.
  - The origin is on the ground at the centre of the front edge.
  - Seen from the front, Bamgbose Street is on the left: -X.
"""

import math
import os
import sys

import bmesh
import bpy
from mathutils import Vector

# --------------------------------------------------------------------------
# Dimensions. Each says where it comes from.
# --------------------------------------------------------------------------

FEET = 0.3048


def feet(ft, inches=0.0):
    return (ft + inches / 12) * FEET


# From a deed sketch of 1914, read off a small reproduction in a 2021 thesis
# (T-deeds). A digit may be misread. The same figures as src/world/ilojo/layout.ts.
CORNER_WIDTH = feet(34, 4)  # the wide part, at the Bamgbose Street end
INNER_WIDTH = feet(26, 9)  # the narrow part
FRONT_WIDTH = CORNER_WIDTH + INNER_WIDTH  # 61 ft 1 in, about 18.6 m

# Estimated from photographs. Not measured.
DEPTH = 7.5  # the two-storey block is two bays deep (C-05, C-06)
FIRST_FLOOR = 4.3  # level of the balcony floors
CORNICE = 8.7  # top of the cornice, foot of the parapet
PARAPET_TOP = 10.0  # the game's collision box is this high

# Counted in the photographs of 1 August 2016 (C-12, C-13).
WIDE_BAYS = 3
NARROW_BAYS = 3

# The openings differ between the two parts of the front, in the photographs
# of that day and in every other view. Sizes are from proportions in C-12,
# good to about 15 per cent.
OPENING = {
    # width, height of the springing above the balcony floor
    "wide": (1.5, 2.45),  # the three on the left: narrower, lower
    "narrow": (1.85, 2.68),  # the three on the right: wider, taller
}
SURROUND = {"wide": 0.12, "narrow": 0.16}  # the raised band round each opening
# How far a balcony runs past its opening on each side. On the right the
# balconies fill the space between the pilasters; on the left they do not.
BALCONY_MARGIN = {"wide": 0.35, "narrow": 0.18}

# What fills each upper opening on 1 August 2016, left to right (C-12).
FRONT_LEAVES = ["Pale", "Timber", "Pale", "Interior", "Interior", "Green"]
# Banners hang from these balconies (C-12, C-13). They are blank here: their
# wording cannot be read. (bay, offset along the railing in metres)
FRONT_BANNERS = [(3, 0.55), (4, -0.55), (6, -0.2)]
# The side's two openings, from the undated photographs.
SIDE_LEAVES = ["Timber", "Timber"]

# Estimates for the pierced parapet: the piercings can be seen but not
# counted with confidence.
PIERCINGS = {"wide": 6, "narrow": 5}

# Construction, chosen for the model and for the game.
SETBACK = 0.15  # wall faces stand this far inside the footprint, so that
#                 pilasters stay within the game's collision box
REVEAL = 0.25  # how far the leaves sit behind the wall face
PILASTER = 0.5  # width
PROJECTION = 0.13  # how far pilasters stand out from the wall
BALCONY_DEPTH = 0.75
RAIL_HEIGHT = 1.0
ARCH_SEGMENTS = 12
CAP_HEIGHT = 8.9  # the plain closing mass stops below the parapet top

COLOURS = {
    # Tones estimated from the photographs of 1 August 2016.
    "Render": "#b1a996",  # weathered grey-buff wall
    "Trim": "#c6bfae",  # pilasters, surrounds, parapet: a tone lighter
    "Base": "#8f887b",  # the darker band at the foot of the wall
    "Iron": "#3b3e40",
    "Green": "#5c8563",  # the shutters at the right-hand end
    "Timber": "#775843",
    "Pale": "#d6d0c2",  # boards and blank banners
    "Interior": "#2a2927",  # an opening standing open
    # Not reconstructed. Deliberately paler and flatter than everything else.
    "Marker": "#e3e4e2",
    "Neutral": "#d0d3d7",
}

PARTS = ["upper-floor", "parapet", "ground-floor", "bamgbose-side", "figure-marker", "cap-and-rear"]
GUIDES = "Guides"

WEST = -FRONT_WIDTH / 2
EAST = FRONT_WIDTH / 2
JOIN = WEST + CORNER_WIDTH  # where the two parts of the front meet
UP = Vector((0, 0, 1))


# --------------------------------------------------------------------------
# Small mesh-building toolkit
# --------------------------------------------------------------------------


class Plane:
    """An elevation to draw on: u runs to the right, z up, d out towards the viewer."""

    def __init__(self, origin, right, out):
        self.origin, self.right, self.out = Vector(origin), Vector(right), Vector(out)

    def at(self, u, z, d=0.0):
        return self.origin + self.right * u + UP * z + self.out * d


# The front, seen from the square. u is x.
FRONT = Plane((0, SETBACK, 0), (1, 0, 0), (0, -1, 0))
# The Bamgbose Street side, seen from the street. u runs from -DEPTH at the
# back to 0 at the front corner, which is on the viewer's right.
SIDE = Plane((WEST + SETBACK, 0, 0), (0, -1, 0), (-1, 0, 0))


def srgb_to_linear(hex_colour):
    def channel(value):
        value /= 255
        return value / 12.92 if value <= 0.04045 else ((value + 0.055) / 1.055) ** 2.4

    h = hex_colour.lstrip("#")
    return tuple(channel(int(h[i : i + 2], 16)) for i in (0, 2, 4)) + (1.0,)


class Mesh:
    """Collects faces into one object of one material."""

    def __init__(self):
        self.bm = bmesh.new()

    def face(self, points, facing):
        """A flat face through `points`, wound so that it faces along `facing`."""
        points = [Vector(p) for p in points]
        # Drop repeated corners, which an arch produces where it meets its springing.
        ring = [p for i, p in enumerate(points) if (p - points[i - 1]).length > 1e-6]
        if len(ring) < 3:
            return
        normal = Vector((0, 0, 0))
        for i, p in enumerate(ring):
            q = ring[(i + 1) % len(ring)]
            normal += Vector(((p.y - q.y) * (p.z + q.z), (p.z - q.z) * (p.x + q.x), (p.x - q.x) * (p.y + q.y)))
        if normal.dot(facing) < 0:
            ring.reverse()
        self.bm.faces.new([self.bm.verts.new(p) for p in ring])

    def box(self, lo, hi):
        lo, hi = Vector(lo), Vector(hi)
        lo, hi = Vector(map(min, lo, hi)), Vector(map(max, lo, hi))
        x0, y0, z0 = lo
        x1, y1, z1 = hi
        self.face([(x0, y0, z0), (x1, y0, z0), (x1, y0, z1), (x0, y0, z1)], (0, -1, 0))
        self.face([(x0, y1, z0), (x1, y1, z0), (x1, y1, z1), (x0, y1, z1)], (0, 1, 0))
        self.face([(x0, y0, z0), (x0, y1, z0), (x0, y1, z1), (x0, y0, z1)], (-1, 0, 0))
        self.face([(x1, y0, z0), (x1, y1, z0), (x1, y1, z1), (x1, y0, z1)], (1, 0, 0))
        self.face([(x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)], (0, 0, 1))
        self.face([(x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0)], (0, 0, -1))

    def slab(self, plane, u0, u1, z0, z1, d0, d1):
        """A box given on an elevation."""
        self.box(plane.at(u0, z0, d0), plane.at(u1, z1, d1))

    def finish(self, name, part, material, smooth=False):
        bmesh.ops.remove_doubles(self.bm, verts=self.bm.verts, dist=1e-5)
        mesh = bpy.data.meshes.new(name)
        self.bm.to_mesh(mesh)
        self.bm.free()
        if smooth:
            for polygon in mesh.polygons:
                polygon.use_smooth = True
        mesh.materials.append(MATERIALS[material])
        obj = bpy.data.objects.new(name, mesh)
        bpy.data.collections[f"Part.{part}"].objects.link(obj)
        return obj


class Hole:
    """An opening in a wall: upright sides, then a round or a pointed head."""

    def __init__(self, centre, width, sill, spring, pointed=False):
        self.centre, self.width, self.sill, self.spring, self.pointed = centre, width, sill, spring, pointed
        self.left, self.right = centre - width / 2, centre + width / 2

    def top(self, u):
        """Height of the head at u."""
        offset = abs(u - self.centre)
        if self.pointed:
            # Two arcs struck from the opposite springing points.
            return self.spring + math.sqrt(max(self.width**2 - (offset + self.width / 2) ** 2, 0.0))
        return self.spring + math.sqrt(max((self.width / 2) ** 2 - offset**2, 0.0))

    @property
    def crown(self):
        return self.top(self.centre)

    def steps(self, segments):
        return [self.left + self.width * i / segments for i in range(segments + 1)]


def sheet(mesh, plane, u0, u1, z0, z1, holes, d=0.0, segments=ARCH_SEGMENTS, back=False):
    """A flat wall face from (u0, z0) to (u1, z1) with holes cut in it."""
    facing = -plane.out if back else plane.out

    def quad(a, b, low, high):
        if b - a > 1e-6 and high - low > 1e-6:
            mesh.face([plane.at(a, low, d), plane.at(b, low, d), plane.at(b, high, d), plane.at(a, high, d)], facing)

    u = u0
    for hole in sorted(holes, key=lambda h: h.centre):
        quad(u, hole.left, z0, z1)
        quad(hole.left, hole.right, z0, hole.sill)
        steps = hole.steps(segments)
        for a, b in zip(steps, steps[1:]):
            mesh.face(
                [plane.at(a, hole.top(a), d), plane.at(b, hole.top(b), d), plane.at(b, z1, d), plane.at(a, z1, d)],
                facing,
            )
        u = hole.right
    quad(u, u1, z0, z1)


def reveal(mesh, plane, hole, front, back, segments=ARCH_SEGMENTS, sill=True):
    """The inside faces of a hole, from depth `front` to depth `back`."""
    middle = plane.at(hole.centre, (hole.sill + hole.spring) / 2, (front + back) / 2)

    def strip(a, za, b, zb):
        corners = [plane.at(a, za, front), plane.at(b, zb, front), plane.at(b, zb, back), plane.at(a, za, back)]
        centre = sum(corners, Vector()) / 4
        mesh.face(corners, middle - centre)

    strip(hole.left, hole.sill, hole.left, hole.spring)
    strip(hole.right, hole.sill, hole.right, hole.spring)
    if sill:
        strip(hole.left, hole.sill, hole.right, hole.sill)
    steps = hole.steps(segments)
    for a, b in zip(steps, steps[1:]):
        strip(a, hole.top(a), b, hole.top(b))


def infill(mesh, plane, hole, d, head, segments=ARCH_SEGMENTS):
    """A flat panel filling a hole: the upright part, or with `head` the arched part."""
    if not head:
        mesh.face(
            [
                plane.at(hole.left, hole.sill, d),
                plane.at(hole.right, hole.sill, d),
                plane.at(hole.right, hole.spring, d),
                plane.at(hole.left, hole.spring, d),
            ],
            plane.out,
        )
        return
    steps = hole.steps(segments)
    for a, b in zip(steps, steps[1:]):
        mesh.face(
            [
                plane.at(a, hole.spring, d),
                plane.at(b, hole.spring, d),
                plane.at(b, hole.top(b), d),
                plane.at(a, hole.top(a), d),
            ],
            plane.out,
        )


def surround(mesh, plane, hole, band, proud, segments=ARCH_SEGMENTS):
    """A raised band round a round-headed hole: its face, and its outer edge."""
    radius = hole.width / 2
    outer = radius + band

    def arc(r, i):
        angle = math.pi * (1 - i / segments)
        return hole.centre + r * math.cos(angle), hole.spring + r * math.sin(angle)

    def edge(a, b):
        corners = [plane.at(*a, proud), plane.at(*b, proud), plane.at(*b, 0), plane.at(*a, 0)]
        centre = sum(corners, Vector()) / 4
        mesh.face(corners, centre - plane.at(hole.centre, hole.spring, proud / 2))

    # The two upright legs.
    for inner_u, outer_u in ((hole.left, hole.left - band), (hole.right, hole.right + band)):
        mesh.face(
            [
                plane.at(inner_u, hole.sill, proud),
                plane.at(outer_u, hole.sill, proud),
                plane.at(outer_u, hole.spring, proud),
                plane.at(inner_u, hole.spring, proud),
            ],
            plane.out,
        )
        edge((outer_u, hole.sill), (outer_u, hole.spring))
    # The head.
    for i in range(segments):
        mesh.face(
            [plane.at(*arc(radius, i), proud), plane.at(*arc(radius, i + 1), proud), plane.at(*arc(outer, i + 1), proud), plane.at(*arc(outer, i), proud)],
            plane.out,
        )
        edge(arc(outer, i), arc(outer, i + 1))


def start_empty_file():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.name = "IlojoBar"
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.scale_length = 1.0
    for name in [f"Part.{part}" for part in PARTS] + [GUIDES]:
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
        bsdf.inputs["Roughness"].default_value = 0.92
        bsdf.inputs["Metallic"].default_value = 0.0
        material.diffuse_color = colour  # what Solid viewport mode shows
        materials[name] = material
    return materials


# --------------------------------------------------------------------------
# An elevation: bays between pilasters, each with one upper opening
# --------------------------------------------------------------------------


def front_bays():
    """(left edge, right edge, kind) for the six bays, left to right."""
    bays = []
    for i in range(WIDE_BAYS):
        width = CORNER_WIDTH / WIDE_BAYS
        bays.append((WEST + i * width, WEST + (i + 1) * width, "wide"))
    for i in range(NARROW_BAYS):
        width = INNER_WIDTH / NARROW_BAYS
        bays.append((JOIN + i * width, JOIN + (i + 1) * width, "narrow"))
    return bays


def side_bays():
    """The side's two bays, back to front, drawn like the wide part of the front."""
    return [(-DEPTH, -DEPTH / 2, "wide"), (-DEPTH / 2, 0.0, "wide")]


def opening(bay):
    left, right, kind = bay
    width, rise = OPENING[kind]
    return Hole((left + right) / 2, width, FIRST_FLOOR, FIRST_FLOOR + rise)


def build_upper_storey(plane, bays, leaves, banners, part, label, u0, u1):
    """The upper storey of one elevation, from the first floor to the cornice."""
    holes = [opening(bay) for bay in bays]
    wall_top = CORNICE - 0.25

    wall = Mesh()
    sheet(wall, plane, u0, u1, FIRST_FLOOR - 0.12, wall_top, holes)
    wall.finish(f"{label}_Upper_Wall", part, "Render")

    trim = Mesh()
    iron = Mesh()
    slabs = Mesh()
    by_material = {}

    def of(material):
        if material not in by_material:
            by_material[material] = Mesh()
        return by_material[material]

    for number, (bay, hole, leaf) in enumerate(zip(bays, holes, leaves), start=1):
        kind = bay[2]
        band, proud = SURROUND[kind], 0.06
        surround(trim, plane, hole, band, proud)
        reveal(trim, plane, hole, proud, -REVEAL, sill=False)

        # What closes the opening: a leaf below, and a plain panel in the head.
        infill(of(leaf), plane, hole, -REVEAL, head=False)
        infill(of("Timber"), plane, hole, -REVEAL, head=True)

        # The balcony: a floor on two brackets, and a plain railing.
        left, right = hole.left - BALCONY_MARGIN[kind], hole.right + BALCONY_MARGIN[kind]
        slabs.slab(plane, left, right, FIRST_FLOOR - 0.12, FIRST_FLOOR, 0, BALCONY_DEPTH)
        for u in (left + 0.18, right - 0.24):
            under = FIRST_FLOOR - 0.12
            profile = [(0, under), (BALCONY_DEPTH - 0.12, under), (0, under - 0.6)]
            for side, facing in ((u, -plane.right), (u + 0.06, plane.right)):
                iron.face([plane.at(side, z, d) for d, z in profile], facing)
            for (d0, z0), (d1, z1) in zip(profile, profile[1:] + profile[:1]):
                corners = [plane.at(u, z0, d0), plane.at(u + 0.06, z0, d0), plane.at(u + 0.06, z1, d1), plane.at(u, z1, d1)]
                centre = sum(corners, Vector()) / 4
                iron.face(corners, centre - plane.at(u + 0.03, under - 0.2, 0.2))

        rail = FIRST_FLOOR + RAIL_HEIGHT
        front = BALCONY_DEPTH - 0.04
        iron.slab(plane, left, right, rail - 0.05, rail, front - 0.05, front)
        iron.slab(plane, left, left + 0.05, rail - 0.05, rail, 0, front)
        iron.slab(plane, right - 0.05, right, rail - 0.05, rail, 0, front)
        count = max(2, round((right - left) / 0.2))
        for i in range(count + 1):
            u = left + (right - left - 0.03) * i / count
            iron.slab(plane, u, u + 0.03, FIRST_FLOOR, rail - 0.05, front - 0.04, front - 0.01)
        for d in (0.25, 0.5):
            for u in (left, right - 0.03):
                iron.slab(plane, u, u + 0.03, FIRST_FLOOR, rail - 0.05, d, d + 0.03)

        for bay_number, offset in banners:
            if bay_number == number:
                centre = hole.centre + offset
                of("Pale").slab(plane, centre - 0.55, centre + 0.55, FIRST_FLOOR + 0.2, FIRST_FLOOR + 0.85, front, front + 0.02)

    # Pilasters between the bays, each with a plain block for a capital.
    edges = sorted({bay[0] for bay in bays} | {bays[-1][1]})
    for edge in edges:
        centre = min(max(edge, u0 + PILASTER / 2), u1 - PILASTER / 2)
        trim.slab(plane, centre - PILASTER / 2, centre + PILASTER / 2, FIRST_FLOOR - 0.12, wall_top - 0.5, 0, PROJECTION)
        trim.slab(plane, centre - 0.33, centre + 0.33, wall_top - 0.5, wall_top, 0, PROJECTION + 0.07)
    # The cornice.
    trim.slab(plane, u0, u1, wall_top, CORNICE, -0.4, 0.3)

    trim.finish(f"{label}_Upper_Trim", part, "Trim")
    iron.finish(f"{label}_Balcony_Ironwork", part, "Iron")
    slabs.finish(f"{label}_Balcony_Floors", part, "Trim")
    for material, mesh in by_material.items():
        mesh.finish(f"{label}_Openings_{material}", part, material)


def build_ground_storey(plane, bays, part, label, u0, u1):
    """Plain: on 1 August 2016 the market hides the ground floor in both photographs."""
    top = FIRST_FLOOR - 0.12
    wall = Mesh()
    sheet(wall, plane, u0, u1, 1.1, top, [])
    wall.finish(f"{label}_Ground_Wall", part, "Render")

    base = Mesh()
    sheet(base, plane, u0, u1, 0.0, 1.1, [])
    base.finish(f"{label}_Ground_Base", part, "Base")

    trim = Mesh()
    edges = sorted({bay[0] for bay in bays} | {bays[-1][1]})
    for edge in edges:
        centre = min(max(edge, u0 + PILASTER / 2), u1 - PILASTER / 2)
        trim.slab(plane, centre - PILASTER / 2, centre + PILASTER / 2, 0.0, top, 0, PROJECTION)
    trim.finish(f"{label}_Ground_Pilasters", part, "Trim")


def finial(mesh, foot):
    """A ball on a short neck. The urns in the photographs, reduced to their outline."""
    mesh.box(foot - Vector((0.06, 0.06, 0)), foot + Vector((0.06, 0.06, 0.1)))
    ball = bmesh.ops.create_uvsphere(mesh.bm, u_segments=8, v_segments=5, radius=0.17)["verts"]
    bmesh.ops.translate(mesh.bm, vec=foot + UP * 0.25, verts=ball)


def build_parapet(plane, bays, part, label, u0, u1, marker_at=None, without=()):
    """Piers over the pilasters with a finial each, and pierced panels between them.

    `without` lists the indices of piers to leave out, where another elevation
    supplies the pier at a shared corner.
    """
    thickness = 0.2
    piers = Mesh()
    panels = Mesh()
    finials = Mesh()

    edges = sorted({bay[0] for bay in bays} | {bays[-1][1]})
    centres = [min(max(edge, u0 + 0.28), u1 - 0.28) for edge in edges]
    for index, centre in enumerate(centres):
        if index in without or index - len(centres) in without:
            continue
        piers.slab(plane, centre - 0.28, centre + 0.28, CORNICE, PARAPET_TOP, -0.3, 0.1)
        piers.slab(plane, centre - 0.33, centre + 0.33, PARAPET_TOP, PARAPET_TOP + 0.08, -0.35, 0.15)
        if marker_at is not None and abs(centre - marker_at) < 0.3:
            continue  # the figure stood here; see build_figure_marker
        finial(finials, plane.at(centre, PARAPET_TOP + 0.08, -0.1))

    for (left, right, kind), a, b in zip(bays, centres, centres[1:]):
        start, end = a + 0.28, b - 0.28
        count = PIERCINGS[kind]
        pitch = (end - start) / count
        holes = [Hole(start + pitch * (i + 0.5), pitch * 0.55, CORNICE + 0.28, CORNICE + 0.72, pointed=True) for i in range(count)]
        top = PARAPET_TOP - 0.05
        sheet(panels, plane, start, end, CORNICE, top, holes, d=0.0, segments=4)
        sheet(panels, plane, start, end, CORNICE, top, holes, d=-thickness, segments=4, back=True)
        for hole in holes:
            reveal(panels, plane, hole, 0.0, -thickness, segments=4)
        panels.face(
            [plane.at(start, top, 0), plane.at(end, top, 0), plane.at(end, top, -thickness), plane.at(start, top, -thickness)],
            UP,
        )

    piers.finish(f"{label}_Parapet_Piers", part, "Trim")
    panels.finish(f"{label}_Parapet_Panels", part, "Trim")
    finials.finish(f"{label}_Parapet_Finials", part, "Trim", smooth=True)


def build_front():
    bays = front_bays()
    u0, u1 = WEST + SETBACK, EAST
    build_upper_storey(FRONT, bays, FRONT_LEAVES, FRONT_BANNERS, "upper-floor", "Front", u0, u1)
    build_ground_storey(FRONT, bays, "ground-floor", "Front", u0, u1)
    build_parapet(FRONT, bays, "parapet", "Front", u0, u1, marker_at=JOIN, without=(0,))

    # One pier at the corner, shared with the side.
    pier = Mesh()
    pier.box((WEST + 0.05, 0.05, CORNICE), (WEST + 0.71, 0.71, PARAPET_TOP))
    pier.box((WEST, 0.0, PARAPET_TOP), (WEST + 0.76, 0.76, PARAPET_TOP + 0.08))
    pier.finish("Corner_Parapet_Pier", "parapet", "Trim")
    ball = Mesh()
    finial(ball, Vector((WEST + 0.38, 0.38, PARAPET_TOP + 0.08)))
    ball.finish("Corner_Parapet_Finial", "parapet", "Trim", smooth=True)

    # The corner post where the front and the side meet, split at the first floor.
    for part, low, high in (("ground-floor", 0.0, FIRST_FLOOR - 0.12), ("upper-floor", FIRST_FLOOR - 0.12, CORNICE)):
        post = Mesh()
        post.box((WEST + 0.02, 0.02, low), (WEST + SETBACK + 0.05, SETBACK + 0.05, high))
        post.finish(f"Corner_Post_{part}", part, "Trim")

    # The cornice turns the corner.
    corner = Mesh()
    corner.box((WEST - 0.15, -0.15, CORNICE - 0.25), (WEST + SETBACK + 0.4, SETBACK + 0.4, CORNICE))
    corner.finish("Corner_Cornice", "upper-floor", "Trim")


def build_side():
    bays = side_bays()
    u0, u1 = -DEPTH, -SETBACK
    build_upper_storey(SIDE, bays, SIDE_LEAVES, [], "bamgbose-side", "Side", u0, u1)
    build_ground_storey(SIDE, bays, "bamgbose-side", "Side", u0, u1)
    build_parapet(SIDE, bays, "bamgbose-side", "Side", u0, u1, without=(-1,))


def build_figure_marker():
    """Where the figure stood, as a plain block. Its shape is not established."""
    marker = Mesh()
    marker.slab(FRONT, JOIN - 0.14, JOIN + 0.14, PARAPET_TOP + 0.08, PARAPET_TOP + 1.05, -0.24, 0.04)
    marker.finish("Figure_Marker_NOT_A_FIGURE", "figure-marker", "Marker")


def build_cap_and_rear():
    """One plain box closing the building behind its walls. Not reconstructed."""
    inset = SETBACK + REVEAL + 0.05
    mass = Mesh()
    mass.box((WEST + inset, inset, 0.0), (EAST, DEPTH, CAP_HEIGHT))
    # The plain ends of the two walls, where the next building stood against them.
    mass.box((EAST - 0.02, SETBACK, 0.0), (EAST, inset, CAP_HEIGHT))
    mass.box((WEST + SETBACK, DEPTH - 0.02, 0.0), (WEST + inset, DEPTH, CAP_HEIGHT))
    mass.finish("Closing_Mass_NOT_RECONSTRUCTED", "cap-and-rear", "Neutral")


# --------------------------------------------------------------------------
# Guides: never exported
# --------------------------------------------------------------------------


def build_guides(scene):
    guides = bpy.data.collections[GUIDES]

    arrow = bpy.data.objects.new("FRONT_faces_the_square", None)
    arrow.empty_display_type = "SINGLE_ARROW"
    arrow.empty_display_size = 3.0
    arrow.rotation_euler = (math.radians(90), 0, 0)  # the arrow points along -Y
    guides.objects.link(arrow)

    camera_data = bpy.data.cameras.new("Preview_Camera")
    camera_data.lens = 30
    camera = bpy.data.objects.new("Preview_Camera", camera_data)
    camera.location = (-16.0, -26.0, 6.0)
    target = Vector((0.0, 3.0, 5.0))
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
        "Casa do Fernandez (Ilojo Bar, Olaiya House), Tinubu Square, Lagos, as on 1 August 2016.\n"
        "A SIMPLIFIED RECONSTRUCTION from cited sources, for the game Time Machine.\n"
        "It is not a survey. See docs/research/milestone-05/ and docs/milestone-07/.\n\n"
        "Conventions\n"
        "  Units: metres. Z is up.\n"
        "  Front faces -Y (towards the square). The body extends towards +Y.\n"
        "  Origin: on the ground, at the centre of the front edge.\n"
        "  Seen from the front, Bamgbose Street is on the left (-X).\n"
        "  Everything below 2.2 m must stay at Y >= 0 and inside the width,\n"
        "  because the game's collision is a box on the plot, not this mesh.\n\n"
        "Parts\n"
        "  Each 'Part.<name>' collection is exported as one mesh called <name>.\n"
        "  The game says what each part rests on, and a test fails if the part\n"
        "  names here and there differ. DO NOT move an object to another part\n"
        "  to tidy up: the part says what evidence it rests on.\n"
        "    upper-floor, parapet   seen in photographs of 1 August 2016\n"
        "    ground-floor           not visible that day; kept plain\n"
        "    bamgbose-side          from undated photographs\n"
        "    figure-marker          a plain block; the figure's shape is unknown\n"
        "    cap-and-rear           not reconstructed; must stay a plain mass\n"
        "  Guides: camera, light and the front arrow. Never exported.\n\n"
        "Do not add detail the photographs do not show. Do not add lettering.\n\n"
        "Exporting\n"
        "  npm run asset:export:ilojo    exports this file as it is to the game's GLB.\n"
        "  npm run asset:generate:ilojo  rebuilds this file from the script and\n"
        "  DISCARDS manual edits. It refuses unless given --force.\n"
    )


# --------------------------------------------------------------------------


def summary():
    print("\nParts")
    lo = Vector((math.inf,) * 3)
    hi = Vector((-math.inf,) * 3)
    total = 0
    for part in PARTS:
        objects = bpy.data.collections[f"Part.{part}"].objects
        triangles = 0
        materials = set()
        for obj in objects:
            obj.data.calc_loop_triangles()
            triangles += len(obj.data.loop_triangles)
            materials.update(material.name for material in obj.data.materials)
            for vert in obj.data.vertices:
                lo = Vector(map(min, lo, vert.co))
                hi = Vector(map(max, hi, vert.co))
        total += triangles
        print(f"  {part:<14} {len(objects):>3} objects  {triangles:>6} triangles  {', '.join(sorted(materials))}")
    size = hi - lo
    print(f"Triangles: {total}")
    print(f"Width  (X): {size.x:.3f} m   from {lo.x:.3f} to {hi.x:.3f}")
    print(f"Depth  (Y): {size.y:.3f} m   from {lo.y:.3f} to {hi.y:.3f}")
    print(f"Height (Z): {size.z:.3f} m   from {lo.z:.3f} to {hi.z:.3f}")
    print(f"Front width from the deed sketch: {FRONT_WIDTH:.3f} m = {CORNER_WIDTH:.3f} + {INNER_WIDTH:.3f}")


def main():
    arguments = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    here = os.path.dirname(os.path.abspath(__file__))
    target = os.path.normpath(os.path.join(here, "..", "ilojo-bar", "ilojo-bar.blend"))

    if os.path.exists(target) and "--force" not in arguments:
        sys.exit(
            f"\n{target} already exists.\n"
            "Regenerating would discard any edits made to it in Blender.\n"
            "To export it as it is:      npm run asset:export:ilojo\n"
            "To regenerate it anyway:    npm run asset:generate:ilojo -- --force\n"
        )

    scene = start_empty_file()
    global MATERIALS
    MATERIALS = make_materials()
    build_front()
    build_side()
    build_figure_marker()
    build_cap_and_rear()
    build_guides(scene)
    summary()

    os.makedirs(os.path.dirname(target), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=target)
    print(f"\nSaved {target}")


MATERIALS = {}

if __name__ == "__main__":
    main()
