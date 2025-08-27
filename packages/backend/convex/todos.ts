import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// fetch all todo
export const getAll = query({
	handler: async (ctx) => {
		return await ctx.db.query("todos").collect();
	},
});

// filter for completion status
// fetch all completed todo
export const getCompleted = query({
	handler: async (ctx) => {
		return await ctx.db.query("todos")
			.filter(q => q.eq(q.field("isCompleted"), true))
			.collect();
	}
});

// fetch all non-completed todo
export const getIncomplete = query({
	handler: async (ctx) => {
		return await ctx.db.query("todos")
			.filter(q => q.eq(q.field("isCompleted"), false))
			.collect();
	},
});

// sort for creation time
// newest first
export const getAllNewest = query({
	handler: async (ctx) => {
		return await ctx.db.query("todos")
			.order("desc")
			.collect();
	},
});

// combination of completion status and sorting
export const getIncompleteNewest = query({
	handler: async (ctx) => {
		return await ctx.db.query("todos")
			.filter(q => q.eq(q.field("isCompleted"), false))
			.order("desc")
			.collect();
	},
});

// create a new todo
export const create = mutation({
	args: {
		title: v.string(),
		description: v.string(),
	},
	handler: async (ctx, args) => {
		const newTodoId = await ctx.db.insert("todos", {
			title: args.title,
			description: args.description,
			isCompleted: false,
		});
		return await ctx.db.get(newTodoId);
	},
});

// update todo
export const updateTodo = mutation({
	args: {
		id: v.id("todos"),
		title: v.optional(v.string()),
		description: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		await ctx.db.patch(args.id, {
			...(args.title !== undefined && {
				title: args.title
			}),
			...(args.description !== undefined && {
				description: args.description
			}),
		});

		return await ctx.db.get(args.id);
	},
});

// update isCompleted
export const toggle = mutation({
	args: {
		id: v.id("todos"),
		isCompleted: v.boolean(),
	},
	handler: async (ctx, args) => {
		await ctx.db.patch(args.id, { isCompleted: args.isCompleted });
		return { success: true };
	},
});

// delete a todo
export const deleteTodo = mutation({
	args: {
		id: v.id("todos"),
	},
	handler: async (ctx, args) => {
		await ctx.db.delete(args.id);
		return { success: true };
	},
});
