// server.ts

// Bug Fix for Project Edit Endpoint Validation

import express from 'express';
import { check, validationResult } from 'express-validator';

const app = express();

app.use(express.json());

// Edit Project Endpoint
app.put('/projects/:id', [
    check('id').isMongoId().withMessage('Invalid Project ID.'),
    check('name').notEmpty().withMessage('Name is required'),
    // Add other validations as necessary
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const projectId = req.params.id;
    const { name } = req.body;

    try {
        // Assume updateProject is a function that updates project in DB
        const updatedProject = await updateProject(projectId, { name });
        if (!updatedProject) {
            return res.status(404).json({ message: 'Project Not Found' });
        }
        return res.status(200).json({ message: 'Project updated successfully', project: updatedProject });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
