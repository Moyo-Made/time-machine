"""Exports a .blend to a GLB for the game, exactly as the .blend is.

Run with Blender, not plain Python:

    npm run asset:export

This never regenerates the model and never saves the .blend: it reads the file,
builds the export in memory and writes only the GLB. Use it after editing the
.blend by hand.

What gets exported:
  - Every mesh object that is not in a collection called "Guides" and is not
    disabled for rendering.
  - With modifiers applied, and joined into one mesh with one part per
    material, so the game draws the building in a handful of calls.

Conventions the .blend must follow (see its "README" text block): metres, Z up,
front facing -Y, origin on the ground at the centre of the front edge. The
exporter turns that into glTF's convention: Y up, front facing +Z.
"""

import json
import math
import os
import sys

import bmesh
import bpy
from mathutils import Vector

TINT = "Tint"
SKIPPED_COLLECTION = "Guides"

# glTF exporter settings. Any name this Blender version does not know is
# dropped and reported, so the script survives exporter changes.
EXPORT_OPTIONS = {
    "export_format": "GLB",
    "use_selection": True,
    "export_yup": True,
    "export_apply": False,  # modifiers are already applied in the joined copy
    "export_normals": True,
    "export_tangents": False,
    "export_texcoords": False,
    "export_materials": "EXPORT",
    "export_image_format": "NONE",
    "export_vertex_color": "ACTIVE",
    "export_all_vertex_colors": False,
    "export_cameras": False,
    "export_lights": False,
    "export_animations": False,
    "export_skins": False,
    "export_morph": False,
    "export_extras": False,
    "export_draco_mesh_compression_enable": False,
}


def exportable_objects(scene):
    skipped = set()
    for collection in bpy.data.collections:
        if collection.name == SKIPPED_COLLECTION:
            skipped.update(collection.all_objects)
    return [
        obj
        for obj in scene.objects
        if obj.type == "MESH" and obj not in skipped and not obj.hide_render
    ]


def join_by_material(objects, name):
    """One mesh holding every object, modifiers applied, in world space."""
    depsgraph = bpy.context.evaluated_depsgraph_get()
    materials = []
    joined = bmesh.new()

    for obj in objects:
        mesh = bpy.data.meshes.new_from_object(obj.evaluated_get(depsgraph))
        mesh.transform(obj.matrix_world)
        if obj.matrix_world.determinant() < 0:
            mesh.flip_normals()  # a mirrored object would otherwise export inside out

        # Objects added by hand may have no tint; give them a neutral one.
        if TINT not in mesh.color_attributes:
            attribute = mesh.color_attributes.new(TINT, "FLOAT_COLOR", "CORNER")
            for item in attribute.data:
                item.color = (1.0, 1.0, 1.0, 1.0)

        slots = [slot.material for slot in obj.material_slots] or [None]
        for material in slots:
            if material not in materials:
                materials.append(material)
        for polygon in mesh.polygons:
            polygon.material_index = materials.index(slots[min(polygon.material_index, len(slots) - 1)])

        joined.from_mesh(mesh)
        bpy.data.meshes.remove(mesh)

    result = bpy.data.meshes.new(name)
    joined.to_mesh(result)
    joined.free()
    for material in materials:
        result.materials.append(material)
    result.color_attributes.active_color = result.color_attributes[TINT]
    result.color_attributes.render_color_index = result.color_attributes.find(TINT)
    return result, materials


def describe(scene, objects):
    print("\nCollections in the file")
    for collection in scene.collection.children_recursive:
        meshes = [obj for obj in collection.objects if obj.type == "MESH"]
        note = "  (not exported)" if collection.name == SKIPPED_COLLECTION else ""
        print(f"  {collection.name:<10} {len(collection.objects):>3} objects, {len(meshes):>3} meshes{note}")
    loose = [obj for obj in scene.collection.objects if obj.type == "MESH"]
    if loose:
        print(f"  (no collection) {len(loose)} meshes")
    print(f"Exporting {len(objects)} mesh objects")


def main():
    arguments = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    if len(arguments) != 2:
        sys.exit("Usage: blender --background --python export_glb.py -- <source.blend> <target.glb>")
    source, target = (os.path.abspath(path) for path in arguments)

    bpy.ops.wm.open_mainfile(filepath=source)
    scene = bpy.context.scene
    objects = exportable_objects(scene)
    if not objects:
        sys.exit(f"Nothing to export: {source} has no mesh objects outside '{SKIPPED_COLLECTION}'.")
    describe(scene, objects)

    name = os.path.splitext(os.path.basename(target))[0]
    mesh, materials = join_by_material(objects, name)
    export = bpy.data.objects.new(name, mesh)
    scene.collection.objects.link(export)
    for obj in scene.objects:
        obj.select_set(False)
    export.select_set(True)
    bpy.context.view_layer.objects.active = export

    known = bpy.ops.export_scene.gltf.get_rna_type().properties.keys()
    options = {key: value for key, value in EXPORT_OPTIONS.items() if key in known}
    dropped = sorted(set(EXPORT_OPTIONS) - set(options))
    if dropped:
        print(f"Exporter options not known to Blender {bpy.app.version_string}: {', '.join(dropped)}")

    os.makedirs(os.path.dirname(target), exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=target, **options)

    mesh.calc_loop_triangles()
    lo = Vector(map(min, *(vert.co for vert in mesh.vertices)))
    hi = Vector(map(max, *(vert.co for vert in mesh.vertices)))
    stats = {
        "blender": bpy.app.version_string,
        "objects": len(objects),
        "materials": [material.name if material else None for material in materials],
        "triangles": len(mesh.loop_triangles),
        "width_x": round(hi.x - lo.x, 3),
        "depth_y": round(hi.y - lo.y, 3),
        "height_z": round(hi.z - lo.z, 3),
        "lowest_z": round(lo.z, 3),
        "front_y": round(lo.y, 3),
        "bytes": os.path.getsize(target),
    }
    if not math.isclose(lo.z, 0.0, abs_tol=0.005):
        print(f"WARNING: the lowest point is at z = {lo.z:.3f} m, not on the ground.")
    print(f"\nExported {target}")
    print("STATS " + json.dumps(stats))
    # The .blend is deliberately not saved: the joined copy lives only in memory.


if __name__ == "__main__":
    main()
